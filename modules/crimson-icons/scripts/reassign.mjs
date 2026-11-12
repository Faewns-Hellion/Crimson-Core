// Applies the precomputed, per-document icon plan. Nothing runs automatically:
// the GM triggers it from the macro or the Icons control.
import { ID } from "./library.mjs";

let planPromise;
function loadPlan() {
  planPromise ??= fetch(`modules/${ID}/data/icon-plan.json`, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("The icon plan could not be loaded.");
      return response.json();
    })
    .catch((error) => {
      planPromise = null;
      throw error;
    });
  return planPromise;
}

/**
 * Reassign every world item and world compendium item from the generated plan.
 * Each collection receives its own distinct icons, so no two entries in the
 * same list share an image.
 */
export async function applyIconPlan({ confirm = true } = {}) {
  if (!game.user?.isGM) throw new Error("Only the GM can reassign item icons.");

  if (confirm) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Reassign item icons" },
      content: `<p>Every world item and every item in the Neon Odyssey compendiums will be given its own icon
        from the ${(await loadPlan()).stats?.iconsUsed ?? "Crimson"} icon catalogue.</p>
        <p>Existing images are replaced. Take a world backup first if you have custom art you want to keep.</p>`,
    });
    if (!ok) return { cancelled: true };
  }

  const plan = await loadPlan();
  const ItemDocument = CONFIG.Item.documentClass;
  const counts = { world: 0, packs: 0, failedPacks: [] };

  const worldUpdates = Object.entries(plan.entries.world ?? {}).flatMap(([id, img]) => {
    const item = game.items.get(id);
    return item && item.img !== img ? [{ _id: id, img }] : [];
  });
  if (worldUpdates.length) {
    await ItemDocument.updateDocuments(worldUpdates);
    counts.world = worldUpdates.length;
  }

  for (const pack of game.packs) {
    if (pack.metadata.packageType !== "world") continue;
    const mapping = plan.entries[pack.metadata.name];
    if (!mapping) continue;
    const documents = await pack.getDocuments();
    const updates = documents.flatMap((doc) =>
      mapping[doc.id] && doc.img !== mapping[doc.id] ? [{ _id: doc.id, img: mapping[doc.id] }] : [],
    );
    if (!updates.length) continue;
    try {
      await pack.documentClass.updateDocuments(updates, { pack: pack.collection });
      counts.packs += updates.length;
    } catch (error) {
      console.warn(`Crimson Icons: could not update ${pack.metadata.name}`, error);
      counts.failedPacks.push(pack.metadata.name);
    }
  }

  const failed = counts.failedPacks.length ? ` ${counts.failedPacks.length} pack(s) were locked.` : "";
  ui.notifications.info(
    `Icons reassigned: ${counts.world} world items and ${counts.packs} compendium items.${failed}`,
  );
  return counts;
}
