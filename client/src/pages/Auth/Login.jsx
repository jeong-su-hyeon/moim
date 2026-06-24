import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../services/authService.js";
import useAuthStore from "../../stores/useAuthStore.js";
import styles from "./Auth.module.css";

// 테스트 계정 (백엔드 없이 동작)
const TEST_ACCOUNT = {
  id: "111",
  password: "111",
  user: { id: "test-001", name: "테스트유저", email: "111", profileUrl: null },
  accessToken: "test-token",
};

export default function Login() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 테스트 계정 체크
    if (form.email === TEST_ACCOUNT.id && form.password === TEST_ACCOUNT.password) {
      loginStore(TEST_ACCOUNT.user, TEST_ACCOUNT.accessToken);
      navigate("/");
      return;
    }

    try {
      const res = await login(form.email, form.password);
      const { user, accessToken } = res.data.data;
      loginStore(user, accessToken);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error?.message ?? "로그인에 실패했습니다.");
    }
  };

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>로그인</h2>

        <div className={styles.testAccountBanner}>
          테스트 계정 &mdash; ID: <strong>111</strong> / PW: <strong>111</strong>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            이메일 / ID
            <input
              className={styles.input}
              type="text"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className={styles.label}>
            비밀번호
            <input
              className={styles.input}
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.submitBtn} type="submit">로그인</button>
        </form>

        <div className={styles.divider}>또는</div>

        <div className={styles.socialBtns}>
          <a className={`${styles.socialBtn} ${styles.google}`} href={`${apiBase}/oauth2/authorize/google`}>
            Google로 계속하기
          </a>
          <a className={`${styles.socialBtn} ${styles.naver}`} href={`${apiBase}/oauth2/authorize/naver`}>
            네이버로 계속하기
          </a>
        </div>

        <p className={styles.footer}>
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
