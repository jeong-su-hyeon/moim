import { Component } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router.jsx";
import ErrorState from "./components/common/ErrorState.jsx";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <ErrorState
          type="generic"
          title="렌더링 오류"
          message={this.state.error.toString()}
        />
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
