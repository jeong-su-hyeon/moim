import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";

const Home          = lazy(() => import("./pages/Home/index.jsx"));
const Login         = lazy(() => import("./pages/Auth/Login.jsx"));
const Signup        = lazy(() => import("./pages/Auth/Signup.jsx"));
const OAuthCallback = lazy(() => import("./pages/Auth/OAuthCallback.jsx"));
const RoomNew       = lazy(() => import("./pages/Room/RoomNew.jsx"));
const Room          = lazy(() => import("./pages/Room/index.jsx"));
const Result        = lazy(() => import("./pages/Result/index.jsx"));

function Loading() {
  return <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>불러오는 중...</div>;
}

function RouteError() {
  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#e53935" }}>페이지 오류</h2>
      <p style={{ marginTop: "12px", color: "#555" }}>페이지를 불러오는 중 문제가 발생했습니다.</p>
      <a href="/" style={{ display: "inline-block", marginTop: "16px", color: "#1a73e8" }}>홈으로 돌아가기</a>
    </div>
  );
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
]);

export default router;
