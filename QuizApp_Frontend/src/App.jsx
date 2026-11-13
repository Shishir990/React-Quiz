import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import MyQuizzes from './pages/MyQuizzes';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Results from './pages/Results';
import ResultDetail from './pages/ResultDetail';
import Leaderboard from './pages/Leaderboard';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AdminLayout from './components/layout/AdminLayout';
import AdminOverview from './pages/admin/Overview';
import AdminQuestionBank from './pages/admin/QuestionBank';
import AdminCategoryQuestions from './pages/admin/CategoryQuestions';
import AdminUsers from './pages/admin/Users';
import { ErrorScreen } from './pages/ErrorScreen'
import { QuestionScreen } from './pages/QuestionScreen'
import { Finish } from './pages/FinishScreen'
import { RouteErrorBoundary } from './components/layout/ErrorBoundary'
function App() {
  return (
    <>
    <BrowserRouter>
      <RouteErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                    <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <MyQuizzes />
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
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
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
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
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
            <Route path="questions" element={<AdminQuestionBank />} />
            {/* Category id goes in ?id= so a refresh finds a real file on the host (see vite.config.js) */}
            <Route path="questions/category" element={<AdminCategoryQuestions />} />
            {/* Categories now live on the Questions page */}
            <Route path="categories" element={<Navigate to="/admin/questions" replace />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </RouteErrorBoundary>
    </BrowserRouter>
    
    </>
  )
}

export default App
