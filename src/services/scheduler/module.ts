import { ContainerModule } from "microinject";
import { BatchingScheduler } from "./BatchingScheduler";

export default new ContainerModule((bind) => {
  bind(BatchingScheduler);
});
