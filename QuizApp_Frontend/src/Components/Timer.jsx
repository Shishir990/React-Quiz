import { useEffect } from "react";
import { useQuiz } from "../Context/Context";
import "../Styles/Pages.css"
export function Timer(){
    const {secondsRemaining,dispatch}=useQuiz()
    const minutes=Math.floor(secondsRemaining / 60)
      const seconds = secondsRemaining % 60;

    useEffect(
        ()=>{
            const interval=setInterval((
                

            )=>{dispatch({type:"tick"})},1000

            )
            return ()=>clearInterval(interval)
        },[]
    )
    return(
        <div>
           {
            <span >
                {
                    `${minutes<10?0:""}${minutes}:${seconds<10?0:""}${seconds}
                    `
                }
            </span>
           }
        </div>
    )
}