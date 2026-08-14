import { createCatppuccinPlugin } from "@catppuccin/daisyui";

export default createCatppuccinPlugin(
	"latte",
	{
		primary: "blue",
		accent: "blue",
		"--radius-selector": "2rem",
		"--radius-field": "2rem",
		"--radius-box": "2rem",
		"--border": "2px",
	},
	{ default: true, prefersdark: false },
);
