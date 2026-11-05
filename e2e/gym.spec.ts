import { expect, test, type Page } from "@playwright/test";

// Seeds found with the engine (rules v2, scouting trainers): drafting the strongest legal offer
// every round with the default order, `e2e4` wins all five battles in easy mode; drafting the
// weakest, `e2e4` loses the first one. In hard mode, `e2e5` shows a blocked offer. Battles are
// deterministic, so these never flake.

/** The daily challenge block only renders on the client: once it shows, the page is hydrated. */
async function hydrated(page: Page) {
  await expect(page.getByTestId("daily")).toBeVisible();
}

async function begin(page: Page, mode: "Fácil" | "Difícil" = "Fácil") {
  await hydrated(page);
  await page.getByRole("radio", { name: new RegExp(`^${mode}`) }).click();
  await page.getByRole("button", { name: `Começar desafio: ${mode}` }).click();
}

async function draftStrongest(page: Page, pick: "first" | "last" = "last") {
  for (let round = 1; round <= 6; round++) {
    await expect(page.getByRole("heading", { name: `Draft · rodada ${round} de 6` })).toBeVisible();
    await page
      .getByRole("button", { name: /^Escolher / })
      [pick]()
      .click();
  }
  await expect(page.getByRole("button", { name: "Batalhar!" })).toBeVisible();
}

async function fightAndSkip(page: Page) {
  await page.getByRole("button", { name: "Batalhar!" }).click();
  await page.getByRole("button", { name: "Pular animação" }).click();
}

async function loseFirstBattle(page: Page) {
  await page.goto("/gym?seed=e2e4");
  await begin(page);
  await draftStrongest(page, "first");
  await fightAndSkip(page);
  return page.getByRole("dialog", { name: "Fim do desafio" });
}

test("drafts a team, wins five battles and keeps the badge after reload", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/gym?seed=e2e4");
  await begin(page);
  await expect(page.getByTestId("die-result")).toContainText("O dado caiu em");
  await draftStrongest(page);
  await expect(page.getByTestId("order-item")).toHaveCount(6);

  for (let battle = 1; battle <= 4; battle++) {
    await expect(page.getByText(`Batalha ${battle} de 5`)).toBeVisible();
    await fightAndSkip(page);
    await expect(page.getByRole("status").filter({ hasText: "Vitória! Próximo:" })).toBeVisible();
    await page.getByRole("button", { name: "Próxima batalha" }).click();
  }
  await expect(page.getByTestId("counter-hint")).toContainText("Brock");
  await fightAndSkip(page);

  // The deciding battle opens the result dialog straight away.
  const dialog = page.getByRole("dialog", { name: "Insígnia da Rocha conquistada!" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("run-mvp")).toBeVisible();
  await expect(dialog.getByTestId("unlocked")).toContainText("Campeão de Pewter");
  await expect(dialog.getByTestId("reward")).toContainText("Ultra Bola");
  await dialog.getByRole("button", { name: "Ver histórico" }).click();
  await expect(page.getByTestId("run-result")).toBeVisible();
  await expect(page.getByTestId("path-won")).toHaveCount(5);
  await expect(page.getByTestId("path-score").first()).toContainText("Placar");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Insígnia da Rocha conquistada!" })).toBeVisible();
  await page.getByRole("button", { name: "Novo desafio" }).first().click();
  await expect(page.getByRole("img", { name: "Insígnia da Rocha" })).toBeVisible();
  await expect(page.getByTestId("gym-stats")).toContainText("Insígnias");
  await expect(page.getByTestId("achievement-unlocked")).not.toHaveCount(0);
  await expect(page.getByTestId("balls")).toContainText("Ultra Bola");
});

test("a defeat opens the result dialog, then the history, then the mode choice", async ({
  page,
}) => {
  const dialog = await loseFirstBattle(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: /Game over/ })).toBeVisible();
  await expect(dialog).toContainText("Você venceu 0 de 5 batalhas.");
  await dialog.getByRole("button", { name: "Ver histórico" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("path-lost")).toHaveCount(1);

  // A new challenge always goes back to choosing the mode.
  await page.getByRole("button", { name: "Novo desafio" }).first().click();
  await expect(page.getByRole("radiogroup", { name: "Escolha o modo" })).toBeVisible();
});

test("Esc closes the result dialog into the history", async ({ page }) => {
  const dialog = await loseFirstBattle(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("run-result")).toBeVisible();
});

test("'Novo desafio' in the result dialog goes to the mode choice", async ({ page }) => {
  const dialog = await loseFirstBattle(page);
  await dialog.getByRole("button", { name: "Novo desafio" }).click();
  await expect(page.getByRole("radiogroup", { name: "Escolha o modo" })).toBeVisible();
  // The last mode used comes preselected.
  await expect(page.getByRole("radio", { name: /^Fácil/ })).toHaveAttribute("aria-checked", "true");
});

test("abandoning asks for confirmation", async ({ page }) => {
  await page.goto("/gym?seed=e2e4");
  await begin(page);
  await page.getByRole("button", { name: "Abandonar desafio" }).click();
  const dialog = page.getByRole("dialog", { name: "Abandonar o desafio?" });
  await dialog.getByRole("button", { name: "Continuar jogando" }).click();
  await expect(page.getByRole("heading", { name: "Draft · rodada 1 de 6" })).toBeVisible();

  await page.getByRole("button", { name: "Abandonar desafio" }).click();
  await dialog.getByRole("button", { name: "Abandonar", exact: true }).click();
  await expect(page.getByRole("radiogroup", { name: "Escolha o modo" })).toBeVisible();
});

test("the draft survives a reload and the reroll can be used once", async ({ page }) => {
  await page.goto("/gym?seed=e2e4");
  await begin(page);
  await page
    .getByRole("button", { name: /^Escolher / })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Draft · rodada 2 de 6" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Draft · rodada 2 de 6" })).toBeVisible();

  const reroll = page.getByRole("button", { name: /Rolar de novo/ });
  await reroll.click();
  await expect(reroll).toBeDisabled();
});

test("the team order can be changed before a battle", async ({ page }) => {
  await page.goto("/gym?seed=e2e4");
  await begin(page);
  await draftStrongest(page);
  const first = page.getByTestId("order-item").first();
  const before = await first.innerText();
  await page
    .getByRole("button", { name: /^Descer / })
    .first()
    .click();
  await expect(first).not.toHaveText(before);
});

test("the daily challenge counts once a day", async ({ page }) => {
  await page.goto("/gym");
  await hydrated(page);
  await page.getByRole("button", { name: /^Desafio do dia .*: Equipe Rocket$/ }).click();
  await expect(page.getByRole("heading", { name: "Equipe Rocket", level: 1 })).toBeVisible();
  await expect(page.getByText(/^Desafio do dia \d\d\/\d\d$/)).toBeVisible();
  await page.getByRole("button", { name: "Abandonar desafio" }).click();
  const dialog = page.getByRole("dialog", { name: "Abandonar o desafio?" });
  await expect(dialog).toContainText("desafio do dia");
  await dialog.getByRole("button", { name: "Abandonar", exact: true }).click();

  await expect(page.getByTestId("daily")).toContainText("concluído: 0 de 5");
  await expect(page.getByRole("button", { name: /^Desafio do dia/ })).toHaveCount(0);
  await expect(page.getByTestId("daily").getByTestId("share")).toBeVisible();
});

test.describe("modes, history and controls", () => {
  test("easy mode shows the opponent in order, your stats, matchups and the cap", async ({
    page,
  }) => {
    await page.goto("/gym?seed=e2e4");
    await begin(page);
    await expect(page.getByTestId("mini-stats").first()).toBeVisible();
    await expect(page.getByTestId("budget")).toContainText("2800");
    await draftStrongest(page);
    await expect(page.getByTestId("opponent-pokemon")).toHaveCount(6);
    await expect(page.getByText("Abre a batalha", { exact: true })).toBeVisible();
    await expect(page.getByTestId("opponent-power")).toContainText("Força total");
    await expect(page.getByTestId("order-item").first().getByTestId("mini-stats")).toBeVisible();
    await expect(page.locator("[data-testid^=matchup-]")).toHaveCount(6);
  });

  test("hard mode hides the opponent's team, your stats and the matchups", async ({ page }) => {
    await page.goto("/gym?seed=e2e4");
    await begin(page, "Difícil");
    await expect(page.getByTestId("mini-stats")).toHaveCount(0);
    await expect(page.getByTestId("budget")).toContainText("2500");
    await draftStrongest(page);
    await expect(page.getByTestId("hidden-pokemon")).toHaveCount(6);
    await expect(page.getByTestId("opponent-pokemon")).toHaveCount(0);
    await expect(page.locator("[data-testid^=matchup-]")).toHaveCount(0);
    await expect(page.getByText(/Modo Difícil · Semente/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ginásio de Cerulean" })).toBeVisible();
    await expect(page.getByTestId("run-path")).toContainText("Misty");
  });

  test("the path records each battle and resets with a new run", async ({ page }) => {
    await page.goto("/gym?seed=e2e4");
    await begin(page);
    await draftStrongest(page);
    await expect(page.getByTestId("path-next")).toHaveCount(1);
    await fightAndSkip(page);
    await page.getByRole("button", { name: "Próxima batalha" }).click();
    await expect(page.getByTestId("path-won")).toHaveCount(1);
    // Trainer names are drawn per run: a class from the Pewter Gym plus a first name.
    await expect(page.getByTestId("path-won")).toContainText(
      /Campista|Escoteira|Garota do Piquenique/,
    );

    await page.getByRole("button", { name: "Abandonar desafio" }).click();
    await page.getByRole("button", { name: "Abandonar", exact: true }).click();
    await begin(page);
    await draftStrongest(page);
    await expect(page.getByTestId("path-won")).toHaveCount(0);
  });

  test("team order: tap two Pokémon to swap them", async ({ page }) => {
    await page.goto("/gym?seed=e2e4");
    await begin(page);
    await draftStrongest(page);
    const items = page.getByTestId("order-item");
    const names = async () => (await items.allInnerTexts()).map((t) => t.split("\n").join(" "));
    const before = await names();

    await items.nth(0).getByRole("button", { pressed: false }).first().click();
    await items.nth(2).getByRole("button", { pressed: false }).first().click();
    const swapped = await names();
    expect(swapped[0]).toContain(before[2]?.split(" ")[1] ?? "");
  });

  test("battle speed and sound are selectable and remembered", async ({ page }) => {
    await page.goto("/gym");
    await hydrated(page);
    await page.getByRole("button", { name: "Rápida" }).click();
    await expect(page.getByRole("button", { name: "Rápida" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const sound = page.getByRole("button", { name: "Som e vibração" });
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(page.getByRole("button", { name: "Rápida" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(sound).toHaveAttribute("aria-pressed", "false");
  });

  test("the game works where Web Audio is missing", async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-expect-error -- simulating a browser without Web Audio
      delete window.AudioContext;
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const dialog = await loseFirstBattle(page);
    await expect(dialog).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("drag and drop (desktop mouse)", () => {
  // A mouse, not touch: HTML5 drag events only fire for mouse input.
  test.use({ hasTouch: false, isMobile: false, viewport: { width: 1280, height: 900 } });

  test("dragging a Pokémon onto the first slot reorders the team", async ({ page }) => {
    await page.goto("/gym?seed=e2e4");
    await begin(page);
    await draftStrongest(page);
    const items = page.getByTestId("order-item");
    // Drag by the grip handle onto the first row (rows next to each other: no scrolling in between).
    const second = (await items.nth(1).innerText()).split("\n")[1] ?? "";
    await items.nth(1).scrollIntoViewIfNeeded();
    await items.nth(1).dragTo(items.nth(0), { sourcePosition: { x: 12, y: 30 } });
    await expect(items.nth(0)).toContainText(second);
  });
});

test.describe("focus layout and battle details", () => {
  test("the gym hides the footer and the search bar", async ({ page }) => {
    await page.goto("/gym");
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("hard mode: strong offers that don't fit show up blocked", async ({ page }) => {
    await page.goto("/gym?seed=e2e5");
    await begin(page, "Difícil");
    let blockedSeen = 0;
    for (let round = 1; round <= 6; round++) {
      await expect(
        page.getByRole("heading", { name: `Draft · rodada ${round} de 6` }),
      ).toBeVisible();
      blockedSeen += await page.getByRole("button", { name: /não cabe no limite/ }).count();
      await page
        .getByRole("button", { name: /^Escolher / })
        .last()
        .click();
    }
    expect(blockedSeen).toBeGreaterThan(0);
  });

  test("the battle shows both fighters' types", async ({ page }) => {
    await page.goto("/gym?seed=e2e4");
    await begin(page);
    await draftStrongest(page);
    await page.getByRole("button", { name: "Batalhar!" }).click();
    await expect(page.getByTestId("fighter-types-player")).not.toBeEmpty();
    await expect(page.getByTestId("fighter-types-opponent")).not.toBeEmpty();
  });
});
