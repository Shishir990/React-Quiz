
import { useQuiz } from "../Context/Context"
import {Header} from "./Header"
import {Footer} from "./Footer"
import {Main} from "./Main"
import {  ErrorScreen } from '../Screens/ErrorScreen'
import { StartScreen } from '../Screens/StartScreen'
import { QuestionScreen } from '../Screens/QuestionScreen'
import { FinishScreen } from '../Screens/FinishScreen'
import { LoadingScreen } from '../Screens/LoadingScreen'
import Dashboard from "../Pages/Dashboard"
import { useNavigate } from "react-router-dom"
export default function AppLayout() {
    const {status,user}=useQuiz()
    const navigate=useNavigate()
    return (
        <div>
            <Header />
            <Main>
              if(user && status==="loading"){
                 navigate("/dashboard")
              }
             if(status === "Error"){
               navigate("/error")
             }
             if(status==="ready"){
                navigate("/start")
             }
             if(status==="start"){
                navigate("/quiz")
             }
             if(status==="finished"){
                navigate("/finish")
             } 
            </Main>
            <Footer />
        </div>
    )
}
