import { createContext, useEffect, useReducer, useState, useContext, useRef } from "react";
import { getMeApi, authFetch } from '../api/auth';
import { queryClient, queryKeys, invalidateAfterSubmit } from '../api/queries';
import { getProgressApi, saveProgressApi, deleteProgressApi } from '../api/progress';
import { saveProgress, loadProgress, clearProgress } from '../utils/quizProgress';
import { buildAnswersLog, SECONDS_PER_QUESTION } from '../utils/quiz';

const Context = createContext();

const initialState = { 
  Questions: [],
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
      const { Questions, answers = {}, visited = {}, marked = {}, index = 0, secondsRemaining, totalTime } = action.payload;
      const answersLog = buildAnswersLog(Questions, answers);
      const at = Math.min(Math.max(index, 0), Questions.length - 1);
      return {
        ...state,
        Questions,
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

    // "Try Again" after submitting: same questions, fresh answers and clock
    case "Reset":
      return {
        ...initialState,
        Questions: state.Questions,
        status: "start",
        secondsRemaining:action.payload,
        totalTime:action.payload,                                                                                                                                                                                                                                                                                                                              
        highestScore: state.highestScore
      };

    default:
      return state;
  }
}

export function ContextProvider({ children }) {

  const [
    { Questions, status, score, index, answer, answers, visited, marked, questionsAttempted, questionsCorrect,answersLog, totalTime , highestScore, secondsRemaining },
    dispatch
  ] = useReducer(reducer, initialState);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [resloading, setResLoading] = useState(false);
  const [resumed, setResumed] = useState(false);
  const numQuestions = Questions?.length;

  useEffect(() => {
    const restoreUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await getMeApi();
        if (data._id) {
          setUser(data);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Session restore failed:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };
    restoreUser();
  }, []);

  // Cached data belongs to whoever was signed in, so wipe it on every
  // account change; otherwise the next user briefly sees the last one's data
  const login = (token, userData) => {
    queryClient.clear();
    localStorage.setItem('token', token);
    // Login/register used to answer with `id`, /auth/me with `_id`. The app reads
    // `_id` (e.g. to save quiz progress), so without this nothing was saved after
    // signing in until the page was refreshed.
    setUser(userData && { ...userData, _id: userData._id || userData.id });
  };

  const logout = () => {
    queryClient.clear();
    localStorage.removeItem('token');
    setUser(null);
  };

  const categoryId = Questions[0]?.category?._id || Questions[0]?.category;

  // ── Saving an in-progress quiz ──
  // Every second it's written to this browser (instant restore after a refresh),
  // and synced to the server shortly after each change, every 15s of play, and
  // when the player leaves, so it can be resumed on another device too.
  const latest = useRef({});
  latest.current = { status, userId: user?._id, categoryId, Questions, answers, visited, marked, index, secondsRemaining, totalTime };
  const syncedToServer = useRef(false);  // has the server got a copy of the current quiz?
  const lastServerSync = useRef(0);
  const syncTimer = useRef(null);
  const discarded = useRef(null);        // category just restarted: ignore stray saves for it

  const syncToServer = ({ keepalive = false } = {}) => {
    clearTimeout(syncTimer.current);
    const s = latest.current;
    if (s.status !== "start" || !s.userId || !s.categoryId || !s.Questions.length) return Promise.resolve();
    if (discarded.current === s.categoryId) return Promise.resolve();
    lastServerSync.current = Date.now();
    return saveProgressApi(s.categoryId, {
      questionIds: s.Questions.map((q) => q._id),
      answers: s.answers,
      visited: s.visited,
      marked: s.marked,
      index: s.index,
      secondsRemaining: s.secondsRemaining,
      savedAt: Date.now(),
    }, { keepalive })
      .then(() => {
        syncedToServer.current = true;
        queryClient.invalidateQueries({ queryKey: queryKeys.savedProgress });
      })
      // Still resumable from this browser's copy; logged loudly so the cause is visible
      .catch((err) => console.error('Could not save quiz progress to the server:', err.message));
  };

  // Local copy, every tick
  useEffect(() => {
    if (status !== "start" || !user?._id || !categoryId) return;
    if (discarded.current === categoryId) return;
    saveProgress(user._id, categoryId, {
      Questions, answers, visited, marked, index, secondsRemaining, totalTime, synced: syncedToServer.current,
    });
  }, [status, user?._id, categoryId, Questions, answers, visited, marked, index, secondsRemaining, totalTime]);

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
  const discardProgress = (catId = categoryId) => {
    clearTimeout(syncTimer.current);
    discarded.current = catId;
    clearProgress(user?._id, catId);
    setResumed(false);
    return deleteProgressApi(catId)
      .catch((err) => console.warn('Could not clear saved quiz:', err.message))
      .finally(() => queryClient.invalidateQueries({ queryKey: queryKeys.savedProgress }));
  };

  // Server copy vs. this browser's copy: use whichever was saved last.
  // "Nothing on the server" wins over an old local copy that had been synced,
  // since that means the quiz was finished or restarted somewhere else.
  const findSavedQuiz = async (catId) => {
    const local = loadProgress(user?._id, catId);
    let server;
    try {
      server = await getProgressApi(catId);
    } catch {
      return local ? { ...local, fromServer: false } : null; // offline: local is all we have
    }
    if (!server) {
      if (local?.synced) { clearProgress(user?._id, catId); return null; }
      return local ? { ...local, fromServer: false } : null;
    }
    if (local && (local.savedAt || 0) > (server.savedAt || 0)) return { ...local, fromServer: false };
    return { ...server, fromServer: true };
  };

  // Play the same questions again after submitting. Submitting marked this quiz as
  // discarded (so late saves can't revive it); a new attempt must clear that,
  // or none of its progress would ever be saved.
  const retryQuiz = () => {
    discarded.current = null;
    syncedToServer.current = false;
    lastServerSync.current = Date.now();
    setResult(null);
    setResumed(false);
    dispatch({ type: "Reset", payload: Questions.length * SECONDS_PER_QUESTION });
  };

  const submitQuiz = async (categoryId, answers, timeTaken) => {
    setResLoading(true);
    try {
      const data = await authFetch('/results/submit', {
        method: 'POST',
        // questionIds lets the server score out of the questions shown, not the whole category
        body: JSON.stringify({ categoryId, answers, timeTaken, questionIds: Questions.map((q) => q._id) }),
      });
      setResult(data);
      discardProgress(categoryId);
      invalidateAfterSubmit();
      dispatch({ type: "Finish" });
    } catch (err) {
      console.error('Submit error:', err.message);
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
        dispatch({ type: "dataReceived", payload: data.questions });
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
        loading,
        resloading,
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