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
  await page.getByRole("button", { name: `Jogar no ${mode}` }).click();
}

/** The start screen: the hub with the challenges. */
const hub = (page: Page) => page.getByRole("heading", { name: "Escolha seu desafio" });

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
  await expect(hub(page)).toBeVisible();
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
  await expect(hub(page)).toBeVisible();
  // The last mode played is highlighted.
  await expect(page.getByTestId("mode-card-easy")).toContainText("Último jogado");
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
  await expect(hub(page)).toBeVisible();
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
  await page.getByRole("button", { name: "Jogar o desafio de hoje" }).click();
  await expect(page.getByRole("heading", { name: "Equipe Rocket", level: 1 })).toBeVisible();
  await expect(page.getByText(/^Desafio do dia \d\d\/\d\d$/)).toBeVisible();
  await page.getByRole("button", { name: "Abandonar desafio" }).click();
  const dialog = page.getByRole("dialog", { name: "Abandonar o desafio?" });
  await expect(dialog).toContainText("desafio do dia");
  await dialog.getByRole("button", { name: "Abandonar", exact: true }).click();

  // Already played today: the result, the countdown and a practice run instead of a new attempt.
  await expect(page.getByTestId("daily-played")).toContainText("0 de 5");
  await expect(page.getByTestId("daily-countdown")).toContainText(/Novo desafio em \d\d:\d\d:\d\d/);
  await expect(page.getByRole("button", { name: "Jogar o desafio de hoje" })).toHaveCount(0);
  await page.getByRole("button", { name: "Treinar (não vale)" }).click();
  await expect(page.getByText(/^Treino · Desafio do dia/)).toBeVisible();
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

test.describe("hub, rewards and legendaries", () => {
  test("the hub explains each challenge and what it gives", async ({ page }) => {
    await page.goto("/gym");
    await hydrated(page);
    await expect(page.getByText("Role o dado. Monte seu time. Vença o ginásio.")).toBeVisible();
    await expect(page.getByTestId("prize-easy")).toContainText("Insígnia da Rocha");
    await expect(page.getByTestId("prize-easy")).toContainText("Ultra Bola");
    await expect(page.getByTestId("prize-hard")).toContainText("Master Ball");
    await expect(page.getByTestId("prize-daily")).toContainText("Master Ball");
    await expect(page.getByRole("heading", { name: "Recompensas" })).toBeVisible();
    await expect(page.getByTestId("bag")).toContainText("Pedra do Trovão");
    await expect(page.getByTestId("legends")).toContainText("0 de 26");
    // Without a Master Ball the legendary encounter only explains how to get one.
    await expect(page.getByTestId("legendary-option")).toContainText("Ganhe uma Master Ball");
  });

  test("past daily challenges can be replayed as practice", async ({ page }) => {
    await page.goto("/gym");
    await hydrated(page);
    await page.getByText("Desafios anteriores").click();
    await page
      .getByRole("button", { name: /^Treinar \d\d\/\d\d$/ })
      .first()
      .click();
    await expect(page.getByText(/^Treino · Desafio do dia/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Draft · rodada 1 de 6" })).toBeVisible();
  });

  test("a Master Ball opens a legendary encounter and catches the pick", async ({ page }) => {
    await page.addInitScript(() => {
      const key = "pokedex:gym-stats:v1";
      if (localStorage.getItem(key)) return;
      const stats = {
        runs: 1,
        cleared: { easy: 0, hard: 1, daily: 0 },
        balls: { poke: 0, great: 0, ultra: 0, master: 1 },
        battlesWon: 5,
        best: 5,
        streak: 1,
        bestStreak: 1,
        used: {},
        caught: [],
      };
      localStorage.setItem(key, JSON.stringify(stats));
    });
    await page.goto("/gym?seed=e2e4");
    await hydrated(page);
    await page.getByLabel("Usar uma Master Ball (você tem 1)").check();
    await page.getByRole("button", { name: "Jogar no Fácil" }).click();
    await expect(page.getByTestId("legendary-round")).toBeVisible();
    await expect(page.getByText("✦ Lendário")).toHaveCount(3);
    await page
      .getByRole("button", { name: /^Escolher / })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: "Draft · rodada 2 de 6" })).toBeVisible();
    await expect(page.getByTestId("legendary-round")).toHaveCount(0);

    await page.getByRole("button", { name: "Abandonar desafio" }).click();
    const dialog = page.getByRole("dialog", { name: "Abandonar o desafio?" });
    await expect(dialog).toContainText("A Master Ball usada não volta.");
    await dialog.getByRole("button", { name: "Abandonar", exact: true }).click();
    await expect(page.getByTestId("legends")).toContainText("1 de 26");
    await expect(page.getByTestId("legendary-option")).toContainText("Ganhe uma Master Ball");
  });
});
