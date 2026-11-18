import { createContext, useEffect, useReducer, useState, useContext, useRef } from "react";
import { getMeApi, authFetch, logoutApi } from '../api/auth';
import { SIGNED_OUT_EVENT, mightBeSignedIn } from '../api/client';
import { queryClient, queryKeys, invalidateAfterSubmit } from '../api/queries';
import { getProgressApi, saveProgressApi, deleteProgressApi } from '../api/progress';
import { saveProgress, loadProgress, clearProgress } from '../utils/quizProgress';
import { buildAnswersLog, SECONDS_PER_QUESTION } from '../utils/quiz';

const Context = createContext();

const initialState = { 
  Questions: [],
  attemptId: null,      // the server's id for this play-through; sent with every save and the submit
  status: "loading",
  score: 0,
  index: 0,
  answer: null,
  answers: {},          // { [questionIndex]: optionIndex }
  visited: { 0: true }, // questions the user has opened
  marked: {},           // questions flagged "mark for review"
  answersLog: [],
  questionsAttempted: 0,
  questionsCorrect: 0,
  highestScore: localStorage.getItem("highestScore") || 0, 
   totalTime: 0,
  secondsRemaining: 0
};

function reducer(state, action) {
  switch (action.type) {

    case "dataReceived":
      return {
        ...state,
        Questions: action.payload,
        attemptId: action.attemptId,
        status: "ready",
        index: 0,
        answer: null,
        answers: {},
        visited: { 0: true },
        marked: {},
        answersLog: [],
        questionsAttempted: 0,
      };

    // Pick up a quiz the player left part-way through
    case "Restore": {
      const { Questions, attemptId = null, answers = {}, visited = {}, marked = {}, index = 0, secondsRemaining, totalTime } = action.payload;
      const answersLog = buildAnswersLog(Questions, answers);
      const at = Math.min(Math.max(index, 0), Questions.length - 1);
      return {
        ...state,
        Questions,
        attemptId,
        status: "start",
        index: at,
        answer: answers[at] ?? null,
        answers,
        visited: { ...visited, [at]: true },
        marked,
        answersLog,
        questionsAttempted: answersLog.length,
        secondsRemaining,
        totalTime,
      };
    }

    case "Loading":
      return { ...state, status: "loading" };

    case "Error":
      return { ...state, status: "Error" };

       case "HardReset":
      return { ...initialState, status: "HardReset" };

    case "Start":
      return { ...state, status: "start", secondsRemaining: action.payload, totalTime: action.payload ,  };
    case "AnswerClicked": {
      // Answers can be changed when revisiting a question via the palette
      const answers = { ...state.answers, [state.index]: action.payload };
      const answersLog = buildAnswersLog(state.Questions, answers);
      return {
        ...state,
        answer: action.payload,
        answers,
        answersLog,
        questionsAttempted: answersLog.length,
      };
    }
    case "Next":
    case "Prev":
    case "GoTo": {
      const target =
        action.type === "Next" ? state.index + 1 :
        action.type === "Prev" ? state.index - 1 :
        action.payload;
      if (target < 0 || target >= state.Questions.length) return state;
      return {
        ...state,
        index: target,
        answer: state.answers[target] ?? null,
        visited: { ...state.visited, [target]: true },
      };
    }

    case "ToggleMark": {
      const marked = { ...state.marked };
      if (marked[state.index]) delete marked[state.index];
      else marked[state.index] = true;
      return { ...state, marked };
    }

    case "tick":
      return {
        ...state,
        secondsRemaining: state.secondsRemaining - 1,
        status: state.secondsRemaining === 0 ? "finished" : state.status
      };

    case "Finish": {  
      return { ...state, status: "finished" };
    }

    case "ResultReceived":{
        const newHighScore = Math.max(action.payload, Number(state.highestScore));
      localStorage.setItem("highestScore", newHighScore);
      return { ...state, highestScore: newHighScore };
    }

    default:
      return state;
  }
}

export function ContextProvider({ children }) {

  const [
    { Questions, attemptId, status, score, index, answer, answers, visited, marked, questionsAttempted, questionsCorrect,answersLog, totalTime , highestScore, secondsRemaining },
    dispatch
  ] = useReducer(reducer, initialState);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [resloading, setResLoading] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const numQuestions = Questions?.length;

  // The session lives in httpOnly cookies, so ask the server who is signed in
  // (apiFetch renews an expired session on the way)
  useEffect(() => {
    const restoreUser = async () => {
      if (!mightBeSignedIn()) {
        setLoading(false);
        return;
      }
      try {
        const data = await getMeApi();
        setUser(data?._id ? data : null);
      } catch (err) {
        console.error('Session restore failed:', err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreUser();
  }, []);

  // The session ended and couldn't be renewed (expired, revoked, signed out elsewhere)
  useEffect(() => {
    const onSignedOut = () => {
      queryClient.clear();
      setUser(null);
    };
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  }, []);

  // Cached data belongs to whoever was signed in, so wipe it on every
  // account change; otherwise the next user briefly sees the last one's data
  const login = (userData) => {
    queryClient.clear();
    // Login/register used to answer with `id`, /auth/me with `_id`. The app reads
    // `_id` (e.g. to save quiz progress), so without this nothing was saved after
    // signing in until the page was refreshed.
    setUser(userData && { ...userData, _id: userData._id || userData.id });
  };

  // Same account, new details (name, email): keep the session and cached data
  const updateUser = (changes) => setUser((u) => (u ? { ...u, ...changes } : u));

  const logout = async () => {
    queryClient.clear();
    setUser(null);
    await logoutApi(); // clears the session cookies on the server
  };

  const categoryId = Questions[0]?.category?._id || Questions[0]?.category;

  // ── Saving an in-progress quiz ──
  // Every second it's written to this browser (instant restore after a refresh),
  // and synced to the server shortly after each change, every 15s of play, and
  // when the player leaves, so it can be resumed on another device too.
  const latest = useRef({});
  latest.current = { status, userId: user?._id, categoryId, attemptId, Questions, answers, visited, marked, index, secondsRemaining, totalTime };
  const syncedToServer = useRef(false);  // has the server got a copy of the current quiz?
  const lastServerSync = useRef(0);
  const syncTimer = useRef(null);
  const discarded = useRef(null);        // category just restarted: ignore stray saves for it

  // Everything before the await runs at once, so a save sent while the tab is closing
  // (keepalive) has already started when this returns
  const syncToServer = async ({ keepalive = false } = {}) => {
    clearTimeout(syncTimer.current);
    const s = latest.current;
    if (s.status !== "start" || !s.userId || !s.categoryId || !s.Questions.length) return;
    if (discarded.current === s.categoryId) return;
    lastServerSync.current = Date.now();
    try {
      await saveProgressApi(s.categoryId, {
        attemptId: s.attemptId || undefined,
        questionIds: s.Questions.map((q) => q._id),
        answers: s.answers,
        visited: s.visited,
        marked: s.marked,
        index: s.index,
        secondsRemaining: s.secondsRemaining,
        savedAt: Date.now(),
      }, { keepalive });
      syncedToServer.current = true;
      queryClient.invalidateQueries({ queryKey: queryKeys.savedProgress });
    } catch (err) {
      // Still resumable from this browser's copy; logged loudly so the cause is visible
      console.error('Could not save quiz progress to the server:', err.message);
    }
  };

  // Local copy, every tick
  useEffect(() => {
    if (status !== "start" || !user?._id || !categoryId) return;
    if (discarded.current === categoryId) return;
    saveProgress(user._id, categoryId, {
      attemptId, Questions, answers, visited, marked, index, secondsRemaining, totalTime, synced: syncedToServer.current,
    });
  }, [status, user?._id, categoryId, attemptId, Questions, answers, visited, marked, index, secondsRemaining, totalTime]);

  // Server copy: soon after an answer or a move
  useEffect(() => {
    if (status !== "start") return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => syncToServer(), 1000);
    return () => clearTimeout(syncTimer.current);
  }, [status, Questions, answers, visited, marked, index]);

  // ...and every 15 seconds while the clock runs
  useEffect(() => {
    if (status === "start" && Date.now() - lastServerSync.current > 15000) syncToServer();
  }, [secondsRemaining]);

  // ...and when the tab is closed or hidden
  useEffect(() => {
    const onHide = () => syncToServer({ keepalive: true });
    window.addEventListener("pagehide", onHide);
    const onVisibility = () => document.visibilityState === "hidden" && onHide();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Called when the player leaves the quiz screen (Save & exit, back button)
  const flushProgress = () => syncToServer({ keepalive: true });

  // Throw away the saved copy, e.g. "Exit & restart", "Start over" or after submitting
  const discardProgress = async (catId = categoryId) => {
    clearTimeout(syncTimer.current);
    discarded.current = catId;
    clearProgress(user?._id, catId);
    setResumed(false);
    try {
      await deleteProgressApi(catId);
    } catch (err) {
      console.warn('Could not clear saved quiz:', err.message);
    } finally {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedProgress });
    }
  };

  // Server copy vs. this browser's copy: use whichever was saved last.
  // The server opens every attempt when it serves the questions, so "nothing on the
  // server" means the attempt was submitted, restarted or expired, and this browser's
  // copy can't be submitted any more. A local copy only wins for the same attempt.
  const findSavedQuiz = async (catId) => {
    const local = loadProgress(user?._id, catId);
    let server;
    try {
      server = await getProgressApi(catId);
    } catch {
      return local ? { ...local, fromServer: false } : null; // offline: local is all we have
    }
    if (!server) {
      if (local) clearProgress(user?._id, catId);
      return null;
    }
    // Copies saved before attempts had ids have none; the server's id applies to them
    const sameAttempt = local && (!local.attemptId || String(local.attemptId) === String(server.attemptId));
    if (sameAttempt && (local.savedAt || 0) > (server.savedAt || 0)) {
      return { ...local, attemptId: server.attemptId, fromServer: false };
    }
    return { ...server, fromServer: true };
  };

  // "Try Again" after submitting: the submitted attempt is used up, so ask the server
  // for a new one. It serves the same category again, in a new random order.
  // (fetchQues clears the "discarded" mark that submitting set.)
  const retryQuiz = () => {
    const catId = categoryId;
    setResult(null);
    setSubmitError('');
    fetchQues(catId, undefined, { fresh: true });
  };

  const submitQuiz = async (categoryId, answers, timeTaken) => {
    if (resloading) return; // a second click while the first submit is on its way
    setResLoading(true);
    setSubmitError('');
    try {
      // The server scores the attempt it served; timeTaken is checked against its own clock
      const data = await authFetch('/results/submit', {
        method: 'POST',
        body: JSON.stringify({ attemptId: attemptId || undefined, categoryId, answers, timeTaken }),
      });
      if (typeof data?.percentage !== 'number') throw new Error(data?.message || 'Could not submit your quiz. Please try again.');
      setResult(data);
      discardProgress(categoryId);
      invalidateAfterSubmit();
      dispatch({ type: "Finish" });
    } catch (err) {
      console.error('Submit error:', err.message);
      setSubmitError(err.message);
    } finally {
      setResLoading(false);
    }
  };

  // Without a limit the server sends every question in the category
  // Only the latest load may update the quiz. Without this, two overlapping loads
  // (React StrictMode runs effects twice in dev; switching quizzes quickly) each
  // fetch a different random question set, and the later one wipes the answers
  // already given on the first, so the wrong quiz gets saved.
  const loadId = useRef(0);

  const fetchQues = async (categoryId, limit, { fresh = false } = {}) => {
    const myLoad = ++loadId.current;
    const stale = () => myLoad !== loadId.current;
    dispatch({ type: "Loading" });
    discarded.current = null;
    const saved = !fresh && await findSavedQuiz(categoryId);
    if (stale()) return;
    if (saved) {
      syncedToServer.current = saved.fromServer || !!saved.synced;
      lastServerSync.current = Date.now();
      dispatch({ type: "Restore", payload: saved });
      setResumed(true);
      return;
    }
    setResumed(false);
    syncedToServer.current = false;
    try {
      const data = await authFetch(`/questions/quiz/${categoryId}${limit ? `?limit=${limit}` : ''}`);
      if (stale()) return;
      if (data.questions) {
        dispatch({ type: "dataReceived", payload: data.questions, attemptId: data.attemptId });
        dispatch({ type: "Start", payload: data.questions.length * SECONDS_PER_QUESTION })
      } else {
        dispatch({ type: "Error" });
      }
    } catch (err) {
      if (!stale()) dispatch({ type: "Error" });
    }
  };

  return (
    <Context.Provider
      value={{
        Questions,
        status,
        index,
        answer,
        answers,
        visited,
        marked,
        score,
        numQuestions,
        secondsRemaining,
        questionsAttempted,
        questionsCorrect,
        highestScore,
        user,
        login,
        logout,
        updateUser,
        loading,
        resloading,
        submitError,
        submitQuiz,
        result,
        answersLog,
        setResult,
        totalTime,
        isAdmin: user?.role === 'admin',
        fetchQues,
        resumed,
        discardProgress,
        flushProgress,
        retryQuiz,
        dispatch
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useQuiz() {
  return useContext(Context);
}