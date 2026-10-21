# Ô cửa bí mật — Nhánh kiểm thử ClassGo

Bản ZIP Google AI Studio có các file rỗng nên **không đè ZIP lên main**.
Đây là bước tích hợp an toàn trên mã `main` mới nhất (đã có sửa bộ đếm gọi tên).

## Thử nghiệm
1. Chọn lớp rồi vào Câu hỏi, thêm ít nhất 4 câu, chọn Chương/Bài nếu muốn.
2. Nhấn Ô cửa bí mật để chơi độc lập hoặc quay ra 1 học sinh và dùng nút Ô cửa ở khu đánh giá.
3. Cấu hình số ô, mức độ, bài học, mở từng ô, về bảng cửa để mở ô tiếp theo.
4. Chấm Đạt/Chưa đạt để ghi lịch sử, không tự cộng lượt gọi hoặc nhập điểm vào sổ.
5. Thưởng sao theo xác nhận; không thưởng trùng trên cùng ô.
6. Xuất kho JSON của một bài ở Google AI Studio, nhập trong Câu hỏi > Nhập vào đúng lớp.

## Giới hạn của PR
Chưa chuyển nguyên trạng toàn bộ màn quản lý kho bài cũ/AI tạo hàng loạt/nhập Excel
từ ZIP; kho câu hỏi trong domain Google AI Studio phải xuất JSON và nhập có xác nhận.
Hãy kiểm thử trên nhánh trước khi merge.
