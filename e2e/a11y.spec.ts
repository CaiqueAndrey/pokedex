import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  "/",
  "/?type=fire&forms=all",
  "/pokemon/charizard",
  "/pokemon/pikachu",
  "/favorites",
  "/team",
  "/compare?a=pikachu&b=raichu",
  "/gym",
];

for (const theme of ["light", "dark"] as const) {
  for (const path of pages) {
    test(`no axe violations on ${path} (${theme})`, async ({ page }) => {
      await page.addInitScript((value) => {
        localStorage.setItem("pokedex:theme:v1", JSON.stringify(value));
        const names = JSON.stringify(["pikachu", "skarmory", "pidgeot"]);
        localStorage.setItem("pokedex:team:v1", names);
        localStorage.setItem("pokedex:favorites:v1", names);
      }, theme);
      // Animations off: axe would otherwise measure contrast on cards mid fade-in.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        ),
      ).toEqual([]);
    });
  }
}
