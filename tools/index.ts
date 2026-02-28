import { oauthTools } from "./oauth/index";
import { calendarTools } from "./calendar/index";
import { gmailTools } from "./gmail/index";
import { driveTools } from "./drive/index";
import { tasksTools } from "./tasks/index";
import { sheetsTools } from "./sheets/index";
import { docsTools } from "./docs/index";
import { accountTools } from "./account/index";
import { serverTools } from "./server/index";

const tools = [
  // Server tools
  ...serverTools,

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

  // Google Sheets tools
  ...sheetsTools,

  // Google Docs tools
  ...docsTools,
];

export default tools;
