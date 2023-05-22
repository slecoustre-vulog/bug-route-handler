import { NextRequest, NextResponse } from 'next/server';

export const GET = () => NextResponse.json({ message: 'Hello, world!' });
export const POST = async (req: NextRequest) => NextResponse.json({ message: 'Hello, world!', body: await req.json() });
