// ── 3. Run providers in parallel ──────────────────────────
    const providers = getAvailableProviders()

    if (providers.length === 0) {
      throw new Error('No AI providers configured — check API keys')
    }

    // Run all providers in parallel, each running their prompts sequentially
    await Promise.all(
      providers.map(async (provider) => {
        for (const promptObj of allPrompts) {
          await sleep(200) // reduced delay per provider

          const result = await provider.runPrompt(promptObj.prompt)

          if (result.error) {
            await supabaseAdmin.from('model_runs').insert({
              audit_id:     auditId,
              model:        provider.name,
              prompt_id:    promptObj.id,
              raw_response: `ERROR: ${result.error}`,
              tokens_used:  null,
              duration_ms:  result.duration_ms,
            })
            continue
          }

          await supabaseAdmin.from('model_runs').insert({
            audit_id:     auditId,
            model:        provider.name,
            prompt_id:    promptObj.id,
            raw_response: result.response,
            tokens_used:  result.tokens_used ?? null,
            duration_ms:  result.duration_ms,
          })

          const mention = extractMention(restaurant.name, result.response)

          await supabaseAdmin.from('mentions').insert({
            audit_id:        auditId,
            model:           provider.name,
            prompt_id:       promptObj.id,
            restaurant_name: restaurant.name,
            mentioned:       mention.mentioned,
            position:        mention.position,
            sentiment:       mention.sentiment,
          })
        }
      })
    )
