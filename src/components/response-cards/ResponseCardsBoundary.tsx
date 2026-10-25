import React from 'react';

/** Keep malformed class/card data from blanking the rest of ClassGo. */
export class ResponseCardsBoundary extends React.Component<{ children: React.ReactNode }, { message: string | null }> {
  declare props: { children: React.ReactNode };
  state = { message: null as string | null };
  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : 'Không đọc được dữ liệu bộ thẻ.' };
  }
  render() {
    if (this.state.message) return <div role="alert" className="m-6 rounded-2xl border border-amber-600 bg-amber-950/50 p-5 text-amber-100">
      <p>Chưa mở được Thẻ trả lời: {this.state.message}</p>
      <p className="mt-2 text-sm">Thầy cô kiểm tra mã học sinh trong Quản lý lớp rồi mở lại mục này. Dữ liệu lớp và điểm được giữ nguyên.</p>
    </div>;
    return this.props.children;
  }
}
