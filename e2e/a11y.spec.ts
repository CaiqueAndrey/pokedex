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
  "/gym/recompensas",
  "/gym/historico",
  "/gym/treinador",
  "/gym/emboscada",
  "/quiz",
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

for (const theme of ["light", "dark"] as const) {
  test(`no axe violations on the gym result dialog (${theme})`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem("pokedex:theme:v1", JSON.stringify(value));
    }, theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    // `e2e2` drafting the weakest offers loses the first battle (see gym.spec.ts).
    await page.goto("/gym?seed=e2e2");
    await expect(page.getByTestId("daily")).toBeVisible();
    await page.getByRole("button", { name: "Jogar no Fácil" }).click();
    for (let round = 1; round <= 6; round++) {
      await expect(
        page.getByRole("heading", { name: `Draft · rodada ${round} de 6` }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: /^Escolher / })
        .first()
        .click();
    }
    await page.getByRole("button", { name: "Batalhar!" }).click();
    await page.getByRole("button", { name: "Pular animação" }).click();
    await expect(page.getByRole("dialog", { name: "Fim do desafio" })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include("dialog")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
}
