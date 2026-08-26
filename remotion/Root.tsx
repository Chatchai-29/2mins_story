import { Composition } from "remotion";
import { VideoComposition, type ShotList } from "./VideoComposition";

const FPS = 30;

// shot list ตัวอย่างสำหรับเปิดใน Remotion Studio (ตอน render จริงจะส่ง inputProps ทับ)
const defaultProps: ShotList = {
  video_id: "preview",
  title: "preview",
  total_duration_sec: 10,
  aspect_ratio: "9:16",
  background_music: "",
  scenes: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Video"
      component={VideoComposition}
      durationInFrames={defaultProps.total_duration_sec * FPS}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
      // คำนวณความยาว/ขนาดจาก shot list ที่ส่งเข้ามาจริง
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.round(props.total_duration_sec * FPS),
        fps: FPS,
        width: 1080,
        height: 1920,
      })}
    />
  );
};
