import { createContext, useEffect, useReducer, useState, useContext } from "react";
import { getMeApi, authFetch } from '../api/auth';

const Context = createContext();

const initialState = {
  Questions: [],
  status: "loading",
  score: 0,
  index: 0,
  answer: null,
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
      return { ...state, Questions: action.payload, status: "ready" };

    case "Error":
      return { ...state, status: "Error" };

       case "HardReset":
      return { ...initialState, status: "HardReset" };

    case "Start":
      return { ...state, status: "start", secondsRemaining: action.payload, totalTime: action.payload ,  };
    case "AnswerClicked": {
      if (state.answer !== null) return state;
      const selectedOption = state.Questions[state.index].options[action.payload]; // ✅ get string
      return {
        ...state,
        answer: action.payload,
        answersLog: [...state.answersLog, {
          question: state.Questions[state.index]._id,
          selectedOption: selectedOption  // ✅ store string e.g. "Paris"
        }],
        questionsAttempted: state.questionsAttempted + 1,
      };
    }
    case "Next":
      return { ...state, index: state.index + 1, answer: null };

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

    case "Reset":
      return {
        ...initialState,
        Questions: state.Questions,
        status: "ready",
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
    { Questions, status, score, index, answer, questionsAttempted, questionsCorrect,answersLog, totalTime , highestScore, secondsRemaining },
    dispatch
  ] = useReducer(reducer, initialState);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [resloading, setResLoading] = useState(false);
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

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const categoryId = Questions[0]?.category?._id || Questions[0]?.category;

  const submitQuiz = async (categoryId, answers, timeTaken) => {
    setResLoading(true);
    try {
      const data = await authFetch('/results/submit', {
        method: 'POST',
        body: JSON.stringify({ categoryId, answers, timeTaken }),
      });
      setResult(data);
      dispatch({ type: "Finish" });
    } catch (err) {
      console.error('Submit error:', err.message);
    } finally {
      setResLoading(false);
    }
  };

  const fetchQues = async (categoryId, limit = 15) => {
    console.log('1. fetchQues called, categoryId:', categoryId);
    try {
      const data = await authFetch(`/questions/quiz/${categoryId}?limit=${limit}`);
      if (data.questions) {
        dispatch({ type: "dataReceived", payload: data.questions });
        dispatch({ type: "Start", payload: data.questions.length * 10 })
      } else {
        dispatch({ type: "Error" });
      }
    } catch (err) {
      dispatch({ type: "Error" });
    }
  };

  return (
    <Context.Provider
      value={{
        Questions,
        status,
        index,
        answer,
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