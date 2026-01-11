import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { videoUrl } = await req.json();

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: "Missing videoUrl parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error("Failed to fetch video");
    }

    const videoBlob = await videoResponse.blob();
    const arrayBuffer = await videoBlob.arrayBuffer();
    const videoData = new Uint8Array(arrayBuffer);

    const inputPath = "/tmp/input.mp4";
    const outputPath = "/tmp/output.mp4";

    await Deno.writeFile(inputPath, videoData);

    try {
      const ffmpegCommand = new Deno.Command("ffmpeg", {
        args: [
          "-i", inputPath,
          "-vf", "drawtext=text='candidteenpro.com':fontcolor=red:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:borderw=3:bordercolor=black:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
          "-codec:a", "copy",
          "-preset", "ultrafast",
          "-y",
          outputPath
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const process = ffmpegCommand.spawn();
      const { code, stderr } = await process.output();

      if (code !== 0) {
        const errorText = new TextDecoder().decode(stderr);
        console.error("FFmpeg error:", errorText);

        await Deno.remove(inputPath).catch(() => {});

        return new Response(videoData, {
          headers: {
            ...corsHeaders,
            "Content-Type": "video/mp4",
            "Content-Disposition": "attachment; filename=video.mp4",
          },
        });
      }

      const watermarkedVideo = await Deno.readFile(outputPath);

      await Deno.remove(inputPath).catch(() => {});
      await Deno.remove(outputPath).catch(() => {});

      return new Response(watermarkedVideo, {
        headers: {
          ...corsHeaders,
          "Content-Type": "video/mp4",
          "Content-Disposition": "attachment; filename=watermarked-video.mp4",
        },
      });
    } catch (ffmpegError) {
      console.error("FFmpeg not available, returning original video:", ffmpegError);

      await Deno.remove(inputPath).catch(() => {});

      return new Response(videoData, {
        headers: {
          ...corsHeaders,
          "Content-Type": "video/mp4",
          "Content-Disposition": "attachment; filename=video.mp4",
        },
      });
    }
  } catch (error) {
    console.error("Error processing video:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process video" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});