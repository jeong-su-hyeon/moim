import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import Spinner from "./components/common/Spinner.jsx";
import ErrorState from "./components/common/ErrorState.jsx";

const Home          = lazy(() => import("./pages/Home/index.jsx"));
const Login         = lazy(() => import("./pages/Auth/Login.jsx"));
const Signup        = lazy(() => import("./pages/Auth/Signup.jsx"));
const OAuthCallback  = lazy(() => import("./pages/Auth/OAuthCallback.jsx"));
const RoomNew        = lazy(() => import("./pages/Room/RoomNew.jsx"));
const Room          = lazy(() => import("./pages/Room/index.jsx"));
const Result        = lazy(() => import("./pages/Result/index.jsx"));

function Loading() {
  return <Spinner fullPage label="불러오는 중..." />;
}

function RouteError() {
  return <ErrorState type="generic" title="페이지 오류" message="페이지를 불러오는 중 문제가 발생했습니다." />;
}

function NotFound() {
  return <ErrorState type="notFound" />;
}

const wrap = (el) => <Suspense fallback={<Loading />}>{el}</Suspense>;

const router = createBrowserRouter([
  { path: "/",                     element: wrap(<Home />),          errorElement: <RouteError /> },
  { path: "/login",                element: wrap(<Login />),         errorElement: <RouteError /> },
  { path: "/signup",               element: wrap(<Signup />),        errorElement: <RouteError /> },
  { path: "/auth/callback/google", element: wrap(<OAuthCallback />), errorElement: <RouteError /> },
  { path: "/auth/callback/naver",  element: wrap(<OAuthCallback />), errorElement: <RouteError /> },
  { path: "/room/new",             element: wrap(<RoomNew />),       errorElement: <RouteError /> },
  { path: "/room/:roomId",         element: wrap(<Room />),          errorElement: <RouteError /> },
  { path: "/room/:roomId/result",  element: wrap(<Result />),        errorElement: <RouteError /> },
  { path: "*",                     element: <NotFound /> },
]);

export default router;
