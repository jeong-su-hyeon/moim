import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "../../stores/useAuthStore.js";
import api from "../../services/api.js";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const loginStore = useAuthStore((s) => s.login);

  useEffect(() => {
    const token = params.get("token");
    if (!token) { navigate("/login"); return; }

    api.get("/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        loginStore(res.data.data, token);
        navigate("/");
      })
      .catch(() => navigate("/login"));
  }, []);

  return <p style={{ padding: "40px", textAlign: "center" }}>로그인 처리 중...</p>;
}
