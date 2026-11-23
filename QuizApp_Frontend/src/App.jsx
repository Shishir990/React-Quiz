import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import MyQuizzes from './pages/MyQuizzes';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConfirmEmail from './pages/ConfirmEmail';
import Results from './pages/Results';
import ResultDetail from './pages/ResultDetail';
import Leaderboard from './pages/Leaderboard';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Live from './pages/Live';
import LiveHistory from './pages/LiveHistory';
import LiveGameDetail from './pages/LiveGameDetail';
import QuizBuilder from './pages/QuizBuilder';
import QuizEditor from './pages/QuizEditor';
import AdminLayout from './components/layout/AdminLayout';
import AdminOverview from './pages/admin/Overview';
import AdminQuestionBank from './pages/admin/QuestionBank';
import AdminCategoryQuestions from './pages/admin/CategoryQuestions';
import AdminUsers from './pages/admin/Users';
import { ErrorScreen } from './pages/ErrorScreen'
import { QuestionScreen } from './pages/QuestionScreen'
import { Finish } from './pages/FinishScreen'
import { RouteErrorBoundary } from './components/layout/ErrorBoundary'
import Friends from './pages/Friends';
import { NotificationsProvider } from './context/NotificationsContext';
import { TopProgress } from './components/ui';
function App() {
  return (
    <>
    <BrowserRouter>
      {/* Lime loading bar at the top while pages load or saves run */}
      <TopProgress />
      <RouteErrorBoundary>
        {/* Live notifications on every signed-in page (inside the router: toasts link to pages) */}
        <NotificationsProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />

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
          {/* Active sessions is now a tab on the Settings page */}
          <Route path="/settings/sessions" element={<Navigate to="/settings?tab=sessions" replace />} />
          <Route
            path="/builder"
            element={
              <ProtectedRoute>
                <QuizBuilder />
              </ProtectedRoute>
            }
          />
          {/* New quiz, or ?id= to edit one */}
          <Route
            path="/builder/edit"
            element={
              <ProtectedRoute>
                <QuizEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live/history"
            element={
              <ProtectedRoute>
                <LiveHistory />
              </ProtectedRoute>
            }
          />
          {/* One past game: ?id= */}
          <Route
            path="/live/history/game"
            element={
              <ProtectedRoute>
                <LiveGameDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live"
            element={
              <ProtectedRoute>
                <Live />
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

          {/* Unknown addresses go to the home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </NotificationsProvider>
      </RouteErrorBoundary>
    </BrowserRouter>
    
    </>
  )
}

export default App
