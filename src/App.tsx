import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loading } from './components/ui'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const QuizEditorPage = lazy(() => import('./pages/QuizEditorPage').then((module) => ({ default: module.QuizEditorPage })))
const QuizPreviewPage = lazy(() => import('./pages/QuizPreviewPage').then((module) => ({ default: module.QuizPreviewPage })))
const HostGamePage = lazy(() => import('./pages/HostGamePage').then((module) => ({ default: module.HostGamePage })))
const PlayerGamePage = lazy(() => import('./pages/PlayerGamePage').then((module) => ({ default: module.PlayerGamePage })))
const PracticePage = lazy(() => import('./pages/PracticePage').then((module) => ({ default: module.PracticePage })))
const ReportPage = lazy(() => import('./pages/ReportPage').then((module) => ({ default: module.ReportPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const SharedQuizPage = lazy(() => import('./pages/SharedQuizPage').then((module) => ({ default: module.SharedQuizPage })))

export function App() {
  return <Suspense fallback={<Loading label="Opening Toohak…" />}><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/quiz/new" element={<QuizEditorPage />} />
    <Route path="/quiz/:quizId/edit" element={<QuizEditorPage />} />
    <Route path="/quiz/:quizId/preview" element={<QuizPreviewPage />} />
    <Route path="/host/:sessionId" element={<HostGamePage />} />
    <Route path="/play/:sessionId" element={<PlayerGamePage />} />
    <Route path="/practice/:assignmentId" element={<PracticePage />} />
    <Route path="/reports/:kind/:reportId" element={<ReportPage />} />
    <Route path="/shared/:quizId" element={<SharedQuizPage />} />
    <Route path="/404" element={<NotFoundPage />} />
    <Route path="*" element={<Navigate to="/404" replace />} />
  </Routes></Suspense>
}
