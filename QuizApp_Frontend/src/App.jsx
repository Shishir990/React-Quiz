import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { ContextProvider, useQuiz } from './Context/Context'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './Components/ProtectedRoute';
import Dashboard from './Pages/Dashboard';
import Login from './Pages/Login';
import Register from './Pages/Register';
import Results from './Pages/Results';
import ResultDetail from './Pages/ResultDetail';
import Leaderboard from './Pages/Leaderboard';
import AdminLayout from './Admin/AdminLayout';
import AdminOverview from './Admin/Overview';
import AdminQuestions from './Admin/Questions';
import AdminCategories from './Admin/Categories';
import AdminUsers from './Admin/Users';
import { ErrorScreen } from './Screens/ErrorScreen'
import { StartScreen } from './Screens/StartScreen'
import { QuestionScreen } from './Screens/QuestionScreen'
import { Finish } from './Screens/FinishScreen'
function App() {

  const { user } = useQuiz();

  return (
    <>
    <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                    <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results/:id"
            element={
              <ProtectedRoute>
                <ResultDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
            <Route
            path="/error"
            element={
              <ProtectedRoute>
                  <ErrorScreen/>
              </ProtectedRoute>
            }
          />
            <Route
               path="/quiz"
            element={
              <ProtectedRoute>
                <QuestionScreen/>
              </ProtectedRoute>
            }
          />

            <Route
            path="/finish"
            element={
              <ProtectedRoute>
                 <Finish/>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="questions" element={<AdminQuestions />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    </BrowserRouter>
    
    </>
  )
}

export default App
