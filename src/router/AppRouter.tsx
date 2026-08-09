import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { WebApp } from '../apps/web/WebApp'
import { RequireAuth } from '../apps/web/guards'
import { AppShell } from '../apps/web/layout/AppShell'
import { ChangePasswordPage } from '../apps/web/pages/ChangePasswordPage'
import { CreateListingPage } from '../apps/web/pages/CreateListingPage'
import { GoForSwapPage } from '../apps/web/pages/GoForSwapPage'
import { HelpPage } from '../apps/web/pages/HelpPage'
import { HomePage } from '../apps/web/pages/HomePage'
import { ListingDetailPage } from '../apps/web/pages/ListingDetailPage'
import { LoginPage } from '../apps/web/pages/LoginPage'
import { MyListingsPage } from '../apps/web/pages/MyListingsPage'
import { NotificationsPage } from '../apps/web/pages/NotificationsPage'
import { PayTransactionPage } from '../apps/web/pages/PayTransactionPage'
import { ProfileEditPage } from '../apps/web/pages/ProfileEditPage'
import { ProfilePage } from '../apps/web/pages/ProfilePage'
import { SearchFiltersPage } from '../apps/web/pages/SearchFiltersPage'
import { SignupPage } from '../apps/web/pages/SignupPage'
import { SwapBayPage } from '../apps/web/pages/SwapBayPage'
import {
  SwapCompletePage,
  SwapConfirmDashPage,
  SwapConfirmYoursPage,
  SwapInterestPage,
  SwapSelectListingPage,
} from '../apps/web/pages/SwapFlowPages'
import { TwoFactorPage } from '../apps/web/pages/TwoFactorPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<WebApp />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />

            <Route element={<RequireAuth />}>
              <Route path="my-listings" element={<MyListingsPage />} />
              <Route path="my-listings/filters" element={<SearchFiltersPage />} />
              <Route path="listings/new" element={<CreateListingPage />} />
              <Route path="listings/:id/swap" element={<SwapInterestPage />} />
              <Route path="listings/:id/swap/select" element={<SwapSelectListingPage />} />
              <Route
                path="listings/:id/swap/confirm-yours"
                element={<SwapConfirmYoursPage />}
              />
              <Route path="listings/:id/swap/confirm" element={<SwapConfirmDashPage />} />
              <Route path="listings/:id/swap/complete" element={<SwapCompletePage />} />
              <Route path="swap-bay" element={<SwapBayPage />} />
              <Route path="swap-bay/:id/go" element={<GoForSwapPage />} />
              <Route path="swap-bay/:id/pay" element={<PayTransactionPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/edit" element={<ProfileEditPage />} />
              <Route path="profile/password" element={<ChangePasswordPage />} />
              <Route path="profile/2fa" element={<TwoFactorPage />} />
              <Route path="profile/help" element={<HelpPage />} />
            </Route>

            <Route path="listings/:id" element={<ListingDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
