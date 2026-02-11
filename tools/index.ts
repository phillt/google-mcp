import { oauthTools } from "./oauth/index";
import { calendarTools } from "./calendar/index";
import { gmailTools } from "./gmail/index";
import { driveTools } from "./drive/index";
import { tasksTools } from "./tasks/index";
import { accountTools } from "./account/index";

const tools = [
  // Account management tools
  ...accountTools,

  // OAuth tools
  ...oauthTools,

  // Calendar tools
  ...calendarTools,

  // Gmail tools
  ...gmailTools,

  // Google Drive tools
  ...driveTools,

  // Google Tasks tools
  ...tasksTools,
];

export default tools;
