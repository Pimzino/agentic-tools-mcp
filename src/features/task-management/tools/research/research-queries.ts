import { z } from 'zod';
import { Task } from '../../models/task.js';
import { Storage } from '../../storage/storage.js';

/**
 * Generate intelligent web search queries for task research
 * This tool helps AI agents perform more effective web research by providing
 * structured, targeted search queries based on task analysis
 */
export function createResearchQueriesGeneratorTool(
  storage: Storage, 
  getWorkingDirectoryDescription: (config: any) => string, 
  config: any
) {
  return {
    name: 'generate_research_queries',
    description: 'Generate intelligent, targeted web search queries for task research. Provides structured search strategies to help AI agents find the most relevant information efficiently.',
    inputSchema: z.object({
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      taskId: z.string().describe('ID of the task to generate research queries for'),
      queryTypes: z.array(z.enum(['implementation', 'best_practices', 'troubleshooting', 'alternatives', 'performance', 'security', 'examples', 'tools'])).optional().describe('Types of queries to generate'),
      includeAdvanced: z.boolean().optional().default(false).describe('Include advanced search operators and techniques'),
      targetYear: z.number().optional().default(new Date().getFullYear()).describe('Target year for recent information (default: current year)')
    }),
    handler: async (args: any) => {
      try {
        const { 
          workingDirectory, 
          taskId, 
          queryTypes, 
          includeAdvanced, 
          targetYear 
        } = args;

        // Get the task
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

        // Generate queries based on task analysis
        const queries = generateSearchQueries(task, queryTypes, targetYear, includeAdvanced);

        // Generate search strategy
        const searchStrategy = generateSearchStrategy(task, queries);

        return {
          content: [{
            type: 'text' as const,
            text: `🔍 **Research Query Generator for Task: ${task.name}**

**Task Analysis:**
- **Complexity:** ${task.complexity || 'Not set'}/10
- **Priority:** ${task.priority}/10
- **Tags:** ${task.tags?.join(', ') || 'None'}
- **Estimated Hours:** ${task.estimatedHours || 'Not set'}

${searchStrategy}

📋 **Generated Search Queries:**

${queries.map(section => `
**${section.category.toUpperCase()} QUERIES:**
${section.queries.map((q, i) => `${i + 1}. ${q.query}
   💡 *Purpose: ${q.purpose}*
   🎯 *Expected results: ${q.expectedResults}*`).join('\n\n')}`).join('\n')}

🚀 **Quick Start Research Commands:**
Copy and paste these optimized queries directly into your web search:

${queries.flatMap(section => 
  section.queries.slice(0, 2).map(q => `• ${q.query}`)
).join('\n')}

💡 **Pro Tips:**
- Start with the "Quick Start" queries above for immediate results
- Use quotes around exact phrases for precise matching
- Add "tutorial" or "guide" to queries when you need step-by-step instructions
- Include the current year (${targetYear}) for the most recent information
- Check multiple sources to verify information accuracy`
          }],
          recommendedNextStep: 'research_task'
        };

      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error generating research queries: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}

interface SearchQuery {
  query: string;
  purpose: string;
  expectedResults: string;
}

interface QuerySection {
  category: string;
  queries: SearchQuery[];
}

/**
 * Generate comprehensive search queries based on task analysis
 */
function generateSearchQueries(
  task: Task, 
  queryTypes?: string[], 
  targetYear?: number, 
  includeAdvanced?: boolean
): QuerySection[] {
  const sections: QuerySection[] = [];
  const taskKeywords = extractKeywords(task);
  const year = targetYear || new Date().getFullYear();
  
  // Default query types if none specified
  const types = queryTypes || ['implementation', 'best_practices', 'examples', 'tools'];

  if (types.includes('implementation')) {
    sections.push({
      category: 'Implementation',
      queries: [
        {
          query: `"${taskKeywords.primary}" implementation guide ${year}`,
          purpose: 'Find recent implementation guides',
          expectedResults: 'Step-by-step tutorials and documentation'
        },
        {
          query: `how to implement ${taskKeywords.primary} ${taskKeywords.secondary.join(' ')}`,
          purpose: 'Get practical implementation advice',
          expectedResults: 'Tutorials, blog posts, and documentation'
        },
        {
          query: `${taskKeywords.primary} setup tutorial ${taskKeywords.technology}`,
          purpose: 'Find setup and configuration guides',
          expectedResults: 'Installation and configuration instructions'
        }
      ]
    });
  }

  if (types.includes('best_practices')) {
    sections.push({
      category: 'Best Practices',
      queries: [
        {
          query: `${taskKeywords.primary} best practices ${year}`,
          purpose: 'Learn industry standards and recommendations',
          expectedResults: 'Best practice guides and recommendations'
        },
        {
          query: `"${taskKeywords.primary}" dos and don\'ts`,
          purpose: 'Understand what to avoid',
          expectedResults: 'Common mistakes and how to avoid them'
        },
        {
          query: `${taskKeywords.primary} architecture patterns`,
          purpose: 'Learn about design patterns and architecture',
          expectedResults: 'Architectural guidance and patterns'
        }
      ]
    });
  }

  if (types.includes('examples')) {
    sections.push({
      category: 'Code Examples',
      queries: [
        {
          query: `${taskKeywords.primary} example code ${taskKeywords.technology}`,
          purpose: 'Find working code examples',
          expectedResults: 'GitHub repositories and code snippets'
        },
        {
          query: `site:github.com ${taskKeywords.primary} ${taskKeywords.secondary.join(' ')}`,
          purpose: 'Find open source implementations',
          expectedResults: 'Real-world code examples and projects'
        },
        {
          query: `"${taskKeywords.primary}" sample project tutorial`,
          purpose: 'Find complete project examples',
          expectedResults: 'Full project tutorials and examples'
        }
      ]
    });
  }

  if (types.includes('tools')) {
    sections.push({
      category: 'Tools & Libraries',
      queries: [
        {
          query: `best ${taskKeywords.technology} libraries for ${taskKeywords.primary}`,
          purpose: 'Find recommended tools and libraries',
          expectedResults: 'Library recommendations and comparisons'
        },
        {
          query: `${taskKeywords.primary} tools comparison ${year}`,
          purpose: 'Compare available tools',
          expectedResults: 'Tool comparisons and reviews'
        },
        {
          query: `${taskKeywords.primary} dependencies requirements`,
          purpose: 'Understand what tools are needed',
          expectedResults: 'Dependency lists and requirements'
        }
      ]
    });
  }

  if (types.includes('troubleshooting')) {
    sections.push({
      category: 'Troubleshooting',
      queries: [
        {
          query: `${taskKeywords.primary} common problems solutions`,
          purpose: 'Anticipate and solve common issues',
          expectedResults: 'Problem-solution pairs and debugging guides'
        },
        {
          query: `site:stackoverflow.com ${taskKeywords.primary} error`,
          purpose: 'Find solutions to common errors',
          expectedResults: 'Stack Overflow solutions and discussions'
        },
        {
          query: `${taskKeywords.primary} debugging tips`,
          purpose: 'Learn debugging techniques',
          expectedResults: 'Debugging guides and troubleshooting tips'
        }
      ]
    });
  }

  if (types.includes('performance')) {
    sections.push({
      category: 'Performance',
      queries: [
        {
          query: `${taskKeywords.primary} performance optimization`,
          purpose: 'Learn optimization techniques',
          expectedResults: 'Performance guides and optimization tips'
        },
        {
          query: `${taskKeywords.primary} scalability patterns`,
          purpose: 'Understand scalability considerations',
          expectedResults: 'Scalability guides and architecture patterns'
        },
        {
          query: `${taskKeywords.primary} benchmarks ${year}`,
          purpose: 'Find performance benchmarks',
          expectedResults: 'Performance data and comparisons'
        }
      ]
    });
  }

  if (types.includes('security')) {
    sections.push({
      category: 'Security',
      queries: [
        {
          query: `${taskKeywords.primary} security best practices`,
          purpose: 'Learn security considerations',
          expectedResults: 'Security guides and recommendations'
        },
        {
          query: `${taskKeywords.primary} vulnerabilities prevention`,
          purpose: 'Understand security risks',
          expectedResults: 'Security vulnerability guides'
        },
        {
          query: `secure ${taskKeywords.primary} implementation`,
          purpose: 'Find secure implementation patterns',
          expectedResults: 'Secure coding practices and examples'
        }
      ]
    });
  }

  if (types.includes('alternatives')) {
    sections.push({
      category: 'Alternatives',
      queries: [
        {
          query: `alternatives to ${taskKeywords.primary} ${year}`,
          purpose: 'Explore different approaches',
          expectedResults: 'Alternative solutions and comparisons'
        },
        {
          query: `${taskKeywords.primary} vs alternatives comparison`,
          purpose: 'Compare different solutions',
          expectedResults: 'Comparison articles and decision guides'
        },
        {
          query: `when not to use ${taskKeywords.primary}`,
          purpose: 'Understand limitations',
          expectedResults: 'Limitation discussions and alternative recommendations'
        }
      ]
    });
  }

  return sections;
}

/**
 * Extract keywords from task for search query generation
 */
function extractKeywords(task: Task): {
  primary: string;
  secondary: string[];
  technology: string;
} {
  const content = (task.name + ' ' + task.details).toLowerCase();
  
  // Extract primary keyword (usually the main technology or concept)
  const primaryPatterns = [
    /\b(authentication|oauth|jwt|login|auth)\b/,
    /\b(database|db|sql|nosql|mongodb|postgresql)\b/,
    /\b(api|rest|graphql|endpoint)\b/,
    /\b(frontend|ui|react|vue|angular)\b/,
    /\b(backend|server|node|express)\b/,
    /\b(testing|test|unit test|integration)\b/,
    /\b(deployment|deploy|ci\/cd|docker)\b/,
    /\b(security|encryption|ssl|https)\b/
  ];

  let primary = task.name.split(' ')[0]; // Default to first word
  for (const pattern of primaryPatterns) {
    const match = content.match(pattern);
    if (match) {
      primary = match[1];
      break;
    }
  }

  // Extract secondary keywords
  const secondary = [
    ...task.tags || [],
    ...task.details.split(' ').filter(word => 
      word.length > 4 && 
      !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'they', 'have', 'will', 'should', 'would'].includes(word.toLowerCase())
    ).slice(0, 3)
  ];

  // Detect technology stack
  const techPatterns = {
    'javascript': /\b(javascript|js|node|npm|yarn)\b/,
    'typescript': /\b(typescript|ts)\b/,
    'python': /\b(python|py|pip|django|flask)\b/,
    'java': /\b(java|spring|maven|gradle)\b/,
    'react': /\b(react|jsx|next\.js)\b/,
    'vue': /\b(vue|nuxt)\b/,
    'angular': /\b(angular|ng)\b/,
    'docker': /\b(docker|container|kubernetes)\b/,
    'aws': /\b(aws|amazon|ec2|s3|lambda)\b/
  };

  let technology = '';
  for (const [tech, pattern] of Object.entries(techPatterns)) {
    if (pattern.test(content)) {
      technology = tech;
      break;
    }
  }

  return { primary, secondary, technology };
}

/**
 * Generate search strategy based on task complexity and type
 */
function generateSearchStrategy(task: Task, queries: QuerySection[]): string {
  const complexity = task.complexity || 5;
  const isHighComplexity = complexity >= 7;
  const isHighPriority = (task.priority || 5) >= 8;

  let strategy = `🎯 **Recommended Search Strategy:**\n\n`;

  if (isHighComplexity) {
    strategy += `⚠️ **High Complexity Task Detected** - Use comprehensive research approach:
1. **Start with official documentation** and authoritative sources
2. **Look for architectural patterns** and design considerations
3. **Research potential pitfalls** and common mistakes
4. **Find case studies** of similar complex implementations
5. **Consider breaking down** into smaller research areas

`;
  }

  if (isHighPriority) {
    strategy += `🚨 **High Priority Task** - Focus on proven, reliable solutions:
1. **Prioritize recent, well-documented approaches**
2. **Look for production-ready examples**
3. **Avoid experimental or cutting-edge solutions**
4. **Focus on stability and reliability**

`;
  }

  strategy += `📚 **Research Order:**
1. **Start with:** Implementation queries for basic understanding
2. **Then explore:** Best practices and examples
3. **Deep dive into:** Tools and specific technical details
4. **Finally check:** Troubleshooting and alternatives

🔍 **Search Tips:**
- Use the first 2-3 queries from each section for quick overview
- Bookmark useful resources as you find them
- Take notes on key findings for memory storage
- Verify information across multiple sources`;

  return strategy;
}
