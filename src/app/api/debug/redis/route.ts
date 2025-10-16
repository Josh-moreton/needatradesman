import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
    try {
        const diagnostics = {
            redisUrlConfigured: !!process.env.REDIS_URL,
            kvCredentialsConfigured: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
            redisUrlPrefix: process.env.REDIS_URL?.substring(0, 20) || "not set",
            kvUrlPrefix: process.env.KV_REST_API_URL?.substring(0, 40) || "not set",
            redisClientExists: !!redis,
            timestamp: new Date().toISOString(),
        };

        // Try to ping Redis if client exists
        if (redis) {
            try {
                // Test with a simple set/get operation
                const testKey = `test:${Date.now()}`;
                await redis.set(testKey, "ok", { ex: 10 });
                const result = await redis.get<string>(testKey);
                await redis.del(testKey);

                return NextResponse.json({
                    ...diagnostics,
                    redisConnected: true,
                    testResult: result,
                });
            } catch (error) {
                return NextResponse.json({
                    ...diagnostics,
                    redisConnected: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return NextResponse.json({
            ...diagnostics,
            redisConnected: false,
            error: "Redis client not initialized",
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: "Diagnostic failed",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
