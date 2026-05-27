import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../../services/authService.js';
import styles from './Auth.module.css';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signup(form.email, form.password, form.name);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? '회원가입에 실패했습니다.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>회원가입</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            이름
            <input
              className={styles.input}
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className={styles.label}>
            이메일
            <input
              className={styles.input}
              type="email"
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
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.submitBtn} type="submit">가입하기</button>
        </form>

        <p className={styles.footer}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
