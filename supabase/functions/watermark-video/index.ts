import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WATERMARK_URL = "https://candidteenpro.com/watermark-logo.png";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const formData = await req.formData();
    const videoFile = formData.get("video") as File;
    const fileName = formData.get("fileName") as string;

    if (!videoFile || !fileName) {
      throw new Error("Missing video file or fileName");
    }

    const videoBytes = await videoFile.arrayBuffer();
    const inputPath = `/tmp/input_${Date.now()}.${fileName.split('.').pop()}`;
    const outputPath = `/tmp/output_${Date.now()}.mp4`;
    const watermarkPath = `/tmp/watermark_${Date.now()}.png`;

    await Deno.writeFile(inputPath, new Uint8Array(videoBytes));

    const watermarkResponse = await fetch(WATERMARK_URL);
    if (!watermarkResponse.ok) {
      throw new Error("Failed to fetch watermark");
    }
    const watermarkBytes = await watermarkResponse.arrayBuffer();
    await Deno.writeFile(watermarkPath, new Uint8Array(watermarkBytes));

    const ffmpegCommand = new Deno.Command("ffmpeg", {
      args: [
        "-i", inputPath,
        "-i", watermarkPath,
        "-filter_complex",
        "[1:v]scale=iw*0.25:-1[wm];[0:v][wm]overlay=20:20",
        "-codec:a", "copy",
        "-y",
        outputPath
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await ffmpegCommand.output();

    if (code !== 0) {
      const errorString = new TextDecoder().decode(stderr);
      console.error("FFmpeg error:", errorString);
      throw new Error("Video processing failed");
    }

    const watermarkedVideo = await Deno.readFile(outputPath);

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("media")
      .upload(fileName, watermarkedVideo, {
        contentType: "video/mp4",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from("media")
      .getPublicUrl(fileName);

    await Deno.remove(inputPath).catch(() => {});
    await Deno.remove(outputPath).catch(() => {});
    await Deno.remove(watermarkPath).catch(() => {});

    return new Response(
      JSON.stringify({ url: publicUrlData.publicUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});