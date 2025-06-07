import { z } from 'zod';
import { Task } from '../../models/task.js';
import { Storage } from '../../storage/storage.js';
import { FileStorage as MemoryFileStorage } from '../../../agent-memories/storage/file-storage.js';

/**
 * Research tool that guides the AI agent to perform web research for tasks
 * and optionally stores findings in memories for future reference
 */
export function createTaskResearchTool(
  storage: Storage,
  memoryStorage: MemoryFileStorage,
  getWorkingDirectoryDescription: (config: any) => string,
  config: any
) {
  return {
    name: 'research_task',
    description: 'Guide the AI agent to perform comprehensive web research for a task, with intelligent research suggestions and automatic memory storage of findings. Combines web research capabilities with local knowledge caching.',
    inputSchema: z.object({
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      taskId: z.string().describe('ID of the task to research'),
      researchAreas: z.array(z.string()).optional().describe('Specific areas to research (auto-generated if not provided)'),
      saveToMemories: z.boolean().optional().default(true).describe('Whether to save research findings to memories'),
      checkExistingMemories: z.boolean().optional().default(true).describe('Whether to check existing memories first'),
      researchDepth: z.enum(['quick', 'standard', 'comprehensive']).optional().default('standard').describe('Depth of research to perform')
    }),
    handler: async (args: any) => {
      try {
        const {
          workingDirectory,
          taskId,
          researchAreas,
          saveToMemories,
          checkExistingMemories,
          researchDepth
        } = args;

        // Get the task to research
        const task = await storage.getTask(taskId);
        if (!task) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Task with ID "${taskId}" not found.`
            }],
            isError: true
          };
        }

        // Check existing memories first if requested
        let existingKnowledge = '';
        if (checkExistingMemories) {
          existingKnowledge = await checkExistingMemoriesForTask(memoryStorage, task);
        }

        // Generate research areas if not provided
        const finalResearchAreas = researchAreas || generateResearchAreas(task);

        // Generate research guidance for the AI agent
        const researchGuidance = generateResearchGuidance(
          task,
          finalResearchAreas,
          researchDepth,
          existingKnowledge
        );

        // Create memory storage instructions if requested
        const memoryInstructions = saveToMemories
          ? generateMemoryStorageInstructions(task, finalResearchAreas)
          : '';

        return {
          content: [{
            type: 'text' as const,
            text: `🔍 **Task Research Guidance for AI Agent**

**Task to Research:** ${task.name}
**Task Details:** ${task.details}
**Priority:** ${task.priority}/10
**Complexity:** ${task.complexity || 'Not set'}/10
**Tags:** ${task.tags?.join(', ') || 'None'}

${existingKnowledge ? `📚 **Existing Knowledge Found:**
${existingKnowledge}

` : ''}🎯 **Research Areas to Investigate:**
${finalResearchAreas.map((area: string, index: number) => `${index + 1}. ${area}`).join('\n')}

${researchGuidance}

${memoryInstructions}

🔄 **After Research:**
1. Update the task with any new insights using \`update_task\`
2. Adjust complexity/priority if research reveals new information
3. Consider breaking down the task if research shows it's more complex than expected
4. Use \`get_next_task_recommendation\` to see if this task is now ready to start`
          }],
          recommendedNextStep: 'update_task'
        };

      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error generating research guidance: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Check existing memories for relevant knowledge about the task
 */
async function checkExistingMemoriesForTask(
  memoryStorage: MemoryFileStorage,
  task: Task
): Promise<string> {
  try {
    // Search for memories related to the task
    const searchTerms = [
      task.name,
      ...task.details.split(' ').filter(word => word.length > 4),
      ...(task.tags || [])
    ];

    let relevantMemories: string[] = [];

    for (const term of searchTerms.slice(0, 5)) { // Limit to avoid too many searches
      try {
        const memories = await memoryStorage.searchMemories({
          query: term,
          limit: 3,
          threshold: 0.3
        });
        relevantMemories.push(...memories.map(m => `• ${m.memory.title}: ${m.memory.content.substring(0, 200)}...`));
      } catch (error) {
        // Continue if search fails
        continue;
      }
    }

    if (relevantMemories.length > 0) {
      return `Found ${relevantMemories.length} relevant memories:\n${relevantMemories.slice(0, 5).join('\n')}`;
    }

    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Generate research areas based on task content
 */
function generateResearchAreas(task: Task): string[] {
  const areas: string[] = [];
  const content = (task.name + ' ' + task.details).toLowerCase();

  // Technology-specific research areas
  const techPatterns = {
    'authentication': ['OAuth2 best practices', 'JWT security considerations', 'Multi-factor authentication implementation'],
    'database': ['Database schema design', 'Performance optimization techniques', 'Data migration strategies'],
    'api': ['REST API design principles', 'API security best practices', 'Rate limiting strategies'],
    'frontend': ['Modern UI/UX patterns', 'Accessibility guidelines', 'Performance optimization'],
    'testing': ['Testing strategies and frameworks', 'Test automation best practices', 'Coverage requirements'],
    'deployment': ['CI/CD pipeline setup', 'Container orchestration', 'Monitoring and logging'],
    'security': ['Security vulnerability assessment', 'Encryption standards', 'Compliance requirements'],
    'performance': ['Performance benchmarking', 'Optimization techniques', 'Scalability patterns']
  };

  // Check for technology keywords and add relevant research areas
  for (const [tech, researchTopics] of Object.entries(techPatterns)) {
    if (content.includes(tech)) {
      areas.push(...researchTopics);
    }
  }

  // Add general research areas based on task tags
  if (task.tags) {
    for (const tag of task.tags) {
      areas.push(`${tag} best practices and current trends`);
      areas.push(`Common pitfalls and solutions for ${tag}`);
    }
  }

  // Add complexity-based research
  if (task.complexity && task.complexity >= 7) {
    areas.push('Architecture patterns for complex implementations');
    areas.push('Risk mitigation strategies');
  }

  // Default research areas if none found
  if (areas.length === 0) {
    areas.push(`Best practices for: ${task.name}`);
    areas.push('Implementation approaches and alternatives');
    areas.push('Common challenges and solutions');
    areas.push('Required tools and dependencies');
  }

  // Remove duplicates and limit to reasonable number
  return [...new Set(areas)].slice(0, 8);
}

/**
 * Generate comprehensive research guidance for the AI agent
 */
function generateResearchGuidance(
  task: Task,
  researchAreas: string[],
  depth: string,
  existingKnowledge: string
): string {
  const depthGuidance = {
    quick: {
      timeframe: '15-30 minutes',
      focus: 'Key concepts and immediate implementation needs',
      sources: '2-3 authoritative sources per area'
    },
    standard: {
      timeframe: '30-60 minutes',
      focus: 'Comprehensive understanding and implementation details',
      sources: '3-5 diverse sources per area including documentation, tutorials, and best practices'
    },
    comprehensive: {
      timeframe: '1-2 hours',
      focus: 'Deep understanding, alternatives, edge cases, and long-term considerations',
      sources: '5+ sources including academic papers, case studies, and expert opinions'
    }
  };

  const guidance = depthGuidance[depth as keyof typeof depthGuidance];

  return `📋 **Research Instructions for AI Agent:**

**Research Depth:** ${depth.toUpperCase()} (${guidance.timeframe})
**Focus:** ${guidance.focus}
**Sources per area:** ${guidance.sources}

🌐 **Web Research Strategy:**
1. **Start with official documentation** for any technologies mentioned
2. **Look for recent tutorials and guides** (prefer content from last 2 years)
3. **Check Stack Overflow and GitHub** for real-world implementation examples
4. **Review best practices articles** from reputable tech blogs
5. **Look for case studies** of similar implementations
${depth === 'comprehensive' ? '6. **Search for academic papers** or research on the topic\n7. **Find expert opinions** and industry reports' : ''}

🔍 **For Each Research Area:**
- Search for: "[area] + implementation guide + ${new Date().getFullYear()}"
- Look for: "[area] + best practices + examples"
- Check: "[area] + common mistakes + solutions"
- Find: "[area] + performance + optimization"

⚠️ **Research Quality Criteria:**
- Prioritize sources from last 2 years for technology topics
- Verify information across multiple sources
- Look for code examples and practical implementations
- Note any version-specific considerations
- Identify potential compatibility issues

🎯 **Expected Research Outcomes:**
- Clear understanding of implementation approach
- List of required tools/dependencies
- Identification of potential challenges
- Time estimate refinement based on research
- Alternative approaches if primary approach has issues`;
}

/**
 * Generate instructions for storing research findings in memories
 */
function generateMemoryStorageInstructions(task: Task, researchAreas: string[]): string {
  return `💾 **Memory Storage Instructions:**

After completing your research, please use the \`create_memory\` tool to store your findings:

**For Each Major Research Area, Create a Memory:**
- **Title:** "${task.name} - [Research Area]" (e.g., "${task.name} - Authentication Best Practices")
- **Content:** Comprehensive summary of findings including:
  - Key concepts and definitions
  - Recommended implementation approach
  - Required tools/libraries/dependencies
  - Best practices and guidelines
  - Common pitfalls to avoid
  - Code examples or snippets
  - Useful links and resources
- **Category:** "task_research"
- **Metadata:**
  \`\`\`json
  {
    "taskId": "${task.id}",
    "taskName": "${task.name}",
    "researchDate": "${new Date().toISOString()}",
    "researchDepth": "standard",
    "priority": ${task.priority || 5},
    "complexity": ${task.complexity || 'null'}
  }
  \`\`\`

**Example Memory Creation:**
\`\`\`
create_memory({
  workingDirectory: "${task.projectId}",
  title: "${task.name} - Implementation Guide",
  content: "Based on research findings: [your detailed research summary]",
  category: "task_research",
  metadata: { "taskId": "${task.id}", "researchDate": "${new Date().toISOString()}" }
})
\`\`\`

This will create a searchable knowledge base for future similar tasks!`;
}
