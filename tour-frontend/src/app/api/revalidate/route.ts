import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-revalidate-secret');
    if (!secret || secret !== process.env.REVALIDATION_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const tag: unknown = body?.tag;
    if (typeof tag !== 'string' || !tag) {
        return NextResponse.json({ error: 'Missing tag' }, { status: 400 });
    }

    revalidateTag(tag, { expire: 0 });
    return NextResponse.json({ revalidated: true, tag });
}
