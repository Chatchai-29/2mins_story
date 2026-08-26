import { Composition } from "remotion";
import { VideoComposition, type ShotList, totalDurationSec } from "./VideoComposition";

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
      // คำนวณความยาว/ขนาดจาก shot list ที่ส่งเข้ามาจริง — ใช้ totalDurationSec (นับรวม scene ที่ยืด
      // ออกเพราะเสียงพากย์ยาวกว่าคลิป) ไม่ใช่ props.total_duration_sec ตรงๆ เพราะเป็นค่า nominal คงที่
      // ที่ไม่รู้เรื่องการยืด scene เลย — ใช้ตรงๆ จะทำให้ท้าย scene ที่ยืดออกโดนตัดทิ้งเงียบๆ
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.round(totalDurationSec(props.scenes) * FPS),
        fps: FPS,
        width: 1080,
        height: 1920,
      })}
    />
  );
};
