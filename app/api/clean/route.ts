import { NextRequest, NextResponse } from 'next/server';
import { cleanMedicalText, invalidRawTextResponse, validateCleanRequest } from '@/lib/clean/medical-text'

export async function POST(request: NextRequest) {
  try {
    let body = await validateCleanRequest(request);

    const { rawText } = body;

    if (!rawText || typeof rawText !== 'string') {
      return invalidRawTextResponse();
    }

    const { cleanText, logs } = cleanMedicalText(rawText);

    return NextResponse.json(
      {
        success: true,
        cleanText,
        logs,
      },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  } catch (error) {
    console.error('[v0] Erro ao limpar texto:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Falha ao limpar texto',
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}
