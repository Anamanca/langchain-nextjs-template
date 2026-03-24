import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    
    if (messages.length === 0) {
      throw new Error("No messages provided");
    }

    const currentMessage = messages[messages.length - 1];
    const previousMessages = messages.slice(0, -1);

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is not defined");
    }

    const model = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      model: "gemini-2.5-flash",
      apiVersion: "v1beta",
      temperature: 0.7, // Giảm temperature một chút để câu trả lời chính xác hơn về thông số
    });

    const TEMPLATE = `Bạn là một chuyên viên Trợ lý Bán hàng chuyên nghiệp của Công ty Toàn Diện (TAE). 

Thông tin liên hệ của chúng tôi:
- Người liên hệ: Mr.Tân
- Số điện thoại: 0903747965
- Email: info@toandien-tae.com

Nhiệm vụ của bạn:
1. Tư vấn sản phẩm: Giúp khách hàng chọn lựa sản phẩm phù hợp với nhu cầu của họ từ danh mục của Toàn Diện (TAE).
2. Thông tin giá cả: Cung cấp giá bán dựa trên dữ liệu hiện có. LƯU Ý: Khi báo giá, bạn PHẢI luôn kèm theo ghi chú "(giá tham khảo, nên không chính xác)".
3. Số lượng tồn kho: Nếu thông tin "Số lượng trong kho" bằng 0, bạn KHÔNG ĐƯỢC trả lời là 0, mà phải trả lời là "Cần kiểm tra lại".
4. Hỗ trợ kỹ thuật: Giải thích các thông số kỹ thuật, cách lắp đặt hoặc khắc phục sự cố cơ bản một cách dễ hiểu.
5. Phong cách: Luôn lịch sự, niềm nở, sử dụng ngôn ngữ bán hàng chuyên nghiệp. Ưu tiên giải đáp ngắn gọn, súc tích nhưng đầy đủ thông tin.

Lưu ý: Chỉ tập trung vào các sản phẩm và dịch vụ liên quan đến Toàn Diện (TAE). Tránh trả lời các vấn đề ngoài lề không liên quan đến kinh doanh. Nếu khách hàng cần hỗ trợ thêm, hãy đề xuất họ liên hệ Mr.Tân qua SĐT 0903747965.`;

    const prompt = PromptTemplate.fromTemplate(TEMPLATE);
    const outputParser = new StringOutputParser();
    const chain = prompt.pipe(model).pipe(outputParser);

    const chatHistory = previousMessages
      .map((m: VercelChatMessage) => `${m.role}: ${m.content}`)
      .join("\n");

    const stream = await chain.stream({
      chat_history: chatHistory || "Chưa có lịch sử trò chuyện.",
      input: currentMessage.content || "",
    });

    return new StreamingTextResponse(stream);
  } catch (e: any) {
    console.error("API Error details:", e);
    return NextResponse.json(
      { error: e.message || "Đã xảy ra lỗi không mong muốn" }, 
      { status: 500 }
    );
  }
}
