import { Next } from "../Components/Next";
import { useQuiz } from "../Context/Context";
import { Questions } from "../Components/Questions";
import { Timer } from "../Components/Timer";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { Finish } from "./FinishScreen";
import "../Styles/Pages.css";
import { useState } from "react";

export function QuestionScreen() {
  const { index, numQuestions, secondsRemaining, fetchQues,status, dispatch } = useQuiz();
  const hasLastQuesReached = index === numQuestions - 1;
  const { categoryId } = useParams();
const [loading,setLoading]=useState(false)
  useEffect(() => {
    fetchQues(categoryId); 
    setLoading(true)
  }, [categoryId]);

 if (status === "finished") {
    return <Finish />;
  }
  
  if (status === "loading") {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading questions...</p>
      </div>
    );
  }
return (
  <div className="quiz-wrapper">
    <Questions />
    <Next isLast={hasLastQuesReached} />
    <div className={`timer ${secondsRemaining < 30 ? "timer-alert" : ""}`}>
      <div className="textContainer">⏱ Time Remaining:</div>
      <Timer />
    </div>
  </div>
);
   
}