import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Welcome from './pages/Welcome'
import Onboarding from './pages/Onboarding'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import VerifyEmail from './pages/VerifyEmail'
import CompleteProfile from './pages/CompleteProfile'
import Dashboard from './pages/Dashboard'
import SplashScreen from './components/SplashScreen'
import ConnectionBanner from './components/ConnectionBanner'
import AssetList from './pages/assets/AssetList'
import AssetForm from './pages/assets/AssetForm'
import AssetDetail from './pages/assets/AssetDetail'
import AssetTrend from './pages/assets/AssetTrend'
import BaselineForm from './pages/baselines/BaselineForm'
import AssessmentForm from './pages/assessments/AssessmentForm'
import MaintenanceList from './pages/maintenance/MaintenanceList'
import MaintenanceForm from './pages/maintenance/MaintenanceForm'
import SyncCentre from './pages/SyncCentre'
import AuditTrail from './pages/AuditTrail'
import LearningCentre from './pages/LearningCentre'
import About from './pages/About'
import { isEngineerOrAbove, isSupervisorOrAbove } from './lib/roles'
import { usePhotoQueueSync } from './hooks/usePhotoQueueSync'

function Gate({ children }) {
  const { authReady } = useAuth()
  // Flush anything queued offline (see src/lib/offlineQueue.js) as soon as
  // there's a connection — this needs no auth state, so it runs regardless.
  usePhotoQueueSync()
  // Show a splash, not a blank screen or a premature redirect, until
  // Firebase's auth listener has fired at least once.
  if (!authReady) return <SplashScreen />
  return children
}

function RequireAuth({ children }) {
  const { user, profile, profileLoading, emailVerified } = useAuth()
  if (!user) return <Navigate to="/welcome" replace />
  if (!emailVerified) return <Navigate to="/verify-email" replace />
  if (profileLoading) return <SplashScreen />
  if (!profile?.profile_completed) return <Navigate to="/complete-profile" replace />
  return children
}

// Gates a page behind a minimum role, on top of RequireAuth. Mirrors
// firestore.rules' role checks as a UX convenience — the rules remain
// the real enforcement boundary regardless of what this allows through.
function RequireRole({ role, children }) {
  const { profile } = useAuth()
  const checkers = { engineer: isEngineerOrAbove, supervisor: isSupervisorOrAbove }
  const check = checkers[role]
  if (check && !check(profile?.role)) return <Navigate to="/dashboard" replace />
  return children
}

function RedirectIfAuthed({ children }) {
  const { user, profile, emailVerified } = useAuth()
  if (user && !emailVerified) return <Navigate to="/verify-email" replace />
  if (user && profile?.profile_completed) return <Navigate to="/dashboard" replace />
  if (user && profile && !profile.profile_completed) return <Navigate to="/complete-profile" replace />
  return children
}

// Guards /verify-email itself: needs a signed-in user, but must NOT bounce
// away just because emailVerified is still false — that's the point of the
// page. Once verified, sends them on to complete-profile/dashboard same as
// RedirectIfAuthed does.
function RequireUnverified({ children }) {
  const { user, profile, emailVerified } = useAuth()
  if (!user) return <Navigate to="/welcome" replace />
  if (emailVerified && profile?.profile_completed) return <Navigate to="/dashboard" replace />
  if (emailVerified && profile && !profile.profile_completed) return <Navigate to="/complete-profile" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Gate>
          <ConnectionBanner />
          <Routes>
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route
              path="/welcome"
              element={
                <RedirectIfAuthed>
                  <Welcome />
                </RedirectIfAuthed>
              }
            />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/sign-up"
              element={
                <RedirectIfAuthed>
                  <SignUp />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/sign-in"
              element={
                <RedirectIfAuthed>
                  <SignIn />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/verify-email"
              element={
                <RequireUnverified>
                  <VerifyEmail />
                </RequireUnverified>
              }
            />
            <Route
              path="/complete-profile"
              element={
                <RequireAuthLoose>
                  <CompleteProfile />
                </RequireAuthLoose>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />

            <Route
              path="/assets"
              element={
                <RequireAuth>
                  <AssetList />
                </RequireAuth>
              }
            />
            <Route
              path="/assets/new"
              element={
                <RequireAuth>
                  <RequireRole role="engineer">
                    <AssetForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/assets/:assetId"
              element={
                <RequireAuth>
                  <AssetDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/assets/:assetId/edit"
              element={
                <RequireAuth>
                  <RequireRole role="engineer">
                    <AssetForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/assets/:assetId/trend"
              element={
                <RequireAuth>
                  <AssetTrend />
                </RequireAuth>
              }
            />
            <Route
              path="/assets/:assetId/baseline"
              element={
                <RequireAuth>
                  <BaselineForm />
                </RequireAuth>
              }
            />

            <Route
              path="/assessments/new"
              element={
                <RequireAuth>
                  <AssessmentForm />
                </RequireAuth>
              }
            />

            <Route
              path="/maintenance"
              element={
                <RequireAuth>
                  <MaintenanceList />
                </RequireAuth>
              }
            />
            <Route
              path="/maintenance/new"
              element={
                <RequireAuth>
                  <MaintenanceForm />
                </RequireAuth>
              }
            />
            <Route
              path="/maintenance/:recordId"
              element={
                <RequireAuth>
                  <MaintenanceForm />
                </RequireAuth>
              }
            />

            <Route
              path="/sync"
              element={
                <RequireAuth>
                  <SyncCentre />
                </RequireAuth>
              }
            />
            <Route
              path="/audit"
              element={
                <RequireAuth>
                  <RequireRole role="supervisor">
                    <AuditTrail />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/learn"
              element={
                <RequireAuth>
                  <LearningCentre />
                </RequireAuth>
              }
            />
            <Route
              path="/about"
              element={
                <RequireAuth>
                  <About />
                </RequireAuth>
              }
            />

            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </Gate>
      </HashRouter>
    </AuthProvider>
  )
}

// Complete Profile needs a signed-in user but must NOT redirect away just
// because profile_completed is still false — that's the whole point of the page.
function RequireAuthLoose({ children }) {
  const { user, profile, profileLoading, emailVerified } = useAuth()
  if (!user) return <Navigate to="/welcome" replace />
  if (!emailVerified) return <Navigate to="/verify-email" replace />
  if (profileLoading) return <SplashScreen />
  if (profile?.profile_completed) return <Navigate to="/dashboard" replace />
  return children
}
