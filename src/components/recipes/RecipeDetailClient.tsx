const handleOutcome = async (outcome: "eaten" | "some_waste" | "all_waste") => {
    try {
      // Collect all ingredient names from the recipe
      const ingredientNames = recipe.ingredients
        .filter((ing) => (ing as { inInventory?: boolean }).inInventory !== false)
        .map((ing) => ing.name.toLowerCase().trim());

      if (ingredientNames.length > 0) {
        const invRes = await fetch("/api/inventory");
        const { items } = await invRes.json();

        // Case-insensitive fuzzy match: ingredient name contains item name OR vice versa
        const toUpdate = (items as { id: string; name: string }[]).filter((item) => {
          const itemName = item.name.toLowerCase().trim();
          return ingredientNames.some(
            (ing) => ing.includes(itemName) || itemName.includes(ing)
          );
        });

        const newStatus = outcome === "all_waste" ? "THROWN_OUT" : "EATEN";

        await Promise.all(
          toUpdate.map((item) =>
            fetch(`/api/inventory/${item.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            })
          )
        );
      }

      // Log MEAL_COOKED activity
      await fetch("/api/log/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MEAL_COOKED",
          metadata: {
            recipeTitle: recipe.title,
            outcome,
            ingredientsUsed: ingredientNames.length,
          },
        }),
      }).catch(() => {}); // non-critical
    } catch { /* noop */ }

    onClose();
  };
