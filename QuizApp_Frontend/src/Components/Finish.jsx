import { useQuiz } from "../Context/Context"
import "../Styles/Pages.css"
export function Finish(){
      
    return(
        <div>
            <button className="next-finish-btn" onClick={handleSubmit}>Submit</button>
        </div>
    )
}