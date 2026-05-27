import { Component } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router.jsx";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "40px", fontFamily: "monospace" }}>
          <h2 style={{ color: "red" }}>렌더링 오류</h2>
          <pre style={{ marginTop: "12px", whiteSpace: "pre-wrap", color: "#333" }}>
            {this.state.error.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
