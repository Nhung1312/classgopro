# ClassGo — ô cửa bí mật & Kho kiểm tra bài cũ (PR nháp)

Được làm trên nhánh riêng từ main (đã sửa bộ đếm, tìm kiếm, nề nếp).
**Không sao chép toàn bộ ZIP Google AI Studio** vì có 7 tệp TSX rỗng.

## Chức năng đã kiểm thử
- Câu hỏi theo Chương/Bài, mức cơ bản/nâng cao trong lớp đang chọn.
- 2,4,6,8,10 ô; nội dung ô cố định lúc bắt đầu; không lặp câu trong phiên.
- Chơi độc lập hoặc gắn học sinh sau một lượt quay; giáo viên đánh giá Đạt/Chưa đạt,
  thưởng sao; không thêm lần gọi hoặc ghi điểm TX tự động.
- Lịch sử phân biệt lượt gọi và đánh giá; chống bấm kép tạo hai bản ghi.
- Nhập JSON kho bài cũ từ AI Studio theo schema v1 và đối chiếu môn/khối/lớp.
- Nhập Excel từ 3 cột **Mức độ, Câu hỏi, Đáp án**; tự lọc câu trùng, yêu cầu giáo viên xác nhận.
- Xuất JSON theo một bài học (chỉ câu có đáp án), đọc lại được bằng AI Studio.
- Lưu trong ClassRoom.questions (dữ liệu lớp); không tự chuyển localStorage của domain AI Studio.

## Chưa có
- Không port nguyên vẹn màn quản trị 170KB, mô-đun tạo câu hỏi Gemini server
  và AI hàng loạt từ ZIP, vì đường API backend/chứng thực chưa được xác nhận.
- Không tự động đồng bộ data AI Studio; cần tự xuất từng kho JSON để chuyển.
- Không merge main cho đến khi giao diện và dữ liệu lớp thật được người dùng thử.
