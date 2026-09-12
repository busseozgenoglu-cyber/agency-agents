# Tencent WorkBuddy

Tencent WorkBuddy can use Agency Agents today without a dedicated converter.
Agency Agents are primarily persona/instruction files, while WorkBuddy separates
**Experts** (who helps) from **Skills** (what the agent can do). The safest
integration is therefore to use an Agency agent Markdown file as task context,
or to let WorkBuddy turn a chosen agent into a reusable custom Skill.

This guide intentionally avoids claiming a native drop-in format that WorkBuddy
does not document.

## Option 1 — Use an Agency agent directly as task context

This requires no generated integration files.

1. Clone or download this repository.
2. In WorkBuddy, create a task and select the repository (or the relevant
   division folder) as the task working directory.
3. Use WorkBuddy's `@` file reference to attach the agent you want, for example:

   ```text
   @engineering/engineering-code-reviewer.md
   Follow this file as the specialist persona and operating instructions for
   this task. Review the current project and return prioritized findings with
   evidence.
   ```

4. Keep WorkBuddy in its default permission mode unless the task genuinely needs
   broader filesystem or command access.

Because the source Markdown remains the single source of truth, this path also
avoids a stale generated copy when an Agency agent changes upstream.

## Option 2 — Turn one Agency agent into a reusable WorkBuddy Skill

WorkBuddy's custom-skill workflow generates a skill package containing a
`skill.yml`, implementation files when needed, and README documentation. An
Agency agent is not itself a WorkBuddy `skill.yml`, so do not rename the `.md`
file and assume it is installable.

Instead, ask WorkBuddy to create a skill from the source agent:

```text
Create a Tencent WorkBuddy skill from
@engineering/engineering-code-reviewer.md.

Preserve the agent's identity, critical rules, workflow, communication style,
and success metrics as instructions. Do not invent external tools or APIs.
The skill should work from the current task context and should not require any
paid service unless I explicitly configure one.
```

Then review the generated skill files, install the skill through WorkBuddy, and
verify it in a fresh task.

## Choosing between Experts, Skills, and source Markdown

| Need | Recommended approach |
| --- | --- |
| Try one Agency agent once | `@` reference the source `.md` file |
| Reuse one workflow repeatedly | Generate a WorkBuddy custom Skill from the agent |
| Need extra APIs/services | Add a WorkBuddy Skill, Connector, or MCP integration separately |
| Need a different specialist | Reference a different Agency agent; do not merge all personas into one prompt |

WorkBuddy's Expert Center supplies domain-specific personas, while Skills add
capabilities. Agency Agents fit most naturally on the persona/instruction side;
only package one as a Skill when persistent reuse is useful.

## Example: Frontend Developer

```text
@engineering/engineering-frontend-developer.md
Act as this specialist for the current task. Inspect the selected project,
identify the smallest production-quality implementation plan, make only the
changes needed for the request, and verify the result before summarizing it.
```

## Example: multi-agent handoff

WorkBuddy supports parallel tasks, so you can keep each Agency role isolated
instead of pasting several personas into one context:

1. Task A — `@engineering/engineering-frontend-developer.md`
2. Task B — `@security/security-appsec-engineer.md`
3. Task C — `@testing/testing-reality-checker.md`
4. Give the final task the relevant outputs and ask it to synthesize only after
   each specialist has finished.

This preserves role boundaries and makes disagreements between specialists
visible instead of flattening them into one oversized system prompt.

## MCP and Connectors

WorkBuddy can connect to MCP servers and services such as GitHub through its
own integration settings. Those capabilities are independent from the Agency
persona files. Configure them in WorkBuddy only when the selected agent's task
actually needs them.

## Notes

- WorkBuddy may evolve its Skill/Expert packaging over time. Prefer the current
  WorkBuddy documentation over hard-coded paths not documented by the product.
- Review generated Skill code before installation, especially if it executes
  scripts or accesses external services.
- Agency agent files can contain tool examples, but examples are not automatic
  permission grants or proof that a tool is installed in WorkBuddy.

## References

- Tencent WorkBuddy documentation — Quick Start
- Tencent WorkBuddy documentation — Create Task (`@` file references and
  working directories)
- Tencent WorkBuddy documentation — Expert Center
- Tencent WorkBuddy documentation — Creating Custom Skills
- Tencent WorkBuddy documentation — MCP Integration

This integration guide addresses #760.
