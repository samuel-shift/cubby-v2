const handleOutcome = async (outcome: "eaten" | "some_waste" | "all_waste") => {
    if (outcome === "eaten" || outcome === "some_waste") {
      // Mark expiry items as eaten
      const expiring = (recipe as GeneratedRecipe).expiryItemsUsed ?? [];
      if (expiring.length > 0) {
        try {
          const invRes = await fetch("/api/inventory");
          const { items } = await invRes.json();
          const toUpdate = items.filter((item: { id: string; name: string }) =>
            expiring.some((e: string) =>
              item.name.toLowerCase().includes(e.toLowerCase()) ||
              e.toLowerCase().includes(item.name.toLowerCase())
            )
          );
          await Promise.all(
            toUpdate.map((item: { id: string }) =>
              fetch(`/api/inventory/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "EATEN" }),
              })
            )
          );
        } catch { /* noop */ }
      }
    }
    onClose();
  };
