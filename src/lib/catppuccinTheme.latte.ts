import { createCatppuccinPlugin } from "@catppuccin/daisyui";

export default createCatppuccinPlugin(
	"latte",
	{
		primary: "blue",
		accent: "blue",
		"--radius-selector": "1rem",
		"--radius-field": "1rem",
		"--radius-box": "1rem",
		"--border": "2px",
	},
	{ default: true, prefersdark: false },
);
