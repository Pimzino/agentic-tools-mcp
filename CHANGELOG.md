# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-05-29

### 🚀 MAJOR: Memory System Architecture Overhaul

This release represents a **complete architectural redesign** of the agent memories system, moving from vector database storage to a simplified, user-friendly JSON file-based approach with intelligent text search.

### Added

#### 📝 Title/Content Separation Architecture
- **Breaking Change**: Memory interface now requires separate `title` and `content` fields
- **Title Field**: Short, descriptive titles (max 50 characters) used for clean file naming
- **Content Field**: Detailed memory information with no character limits
- **File Naming**: Memory files now named after sanitized titles for better organization
- **Validation**: Hard 50-character limit on titles with helpful error messages and examples

#### 🔍 Intelligent Multi-Field Search System
- **Enhanced Search**: Searches across title, content, and category fields simultaneously
- **Advanced Scoring**: Sophisticated relevance algorithm with field-based priority weighting
- **Title Priority**: Title matches receive 60% weight (highest priority)
- **Content Priority**: Content matches receive 30% weight (medium priority)
- **Category Bonus**: Category matches add 20% bonus to relevance score
- **Position Scoring**: Earlier matches in text receive higher relevance scores
- **Frequency Scoring**: Multiple occurrences of search terms boost relevance

#### 📊 Comprehensive Search Scoring Documentation
- **Algorithm Transparency**: Complete documentation of relevance scoring calculations
- **Score Interpretation**: Clear guidelines for understanding relevance percentages
- **Optimization Guide**: Best practices for structuring memories for maximum searchability
- **Real-World Examples**: Concrete examples showing expected relevance scores
- **User Education**: Detailed explanations help users understand and optimize search results

### Changed

#### 🗄️ Storage System Complete Replacement
- **Removed**: LanceDB vector database dependency completely eliminated
- **Replaced**: Simple JSON file storage with category-based directory organization
- **File Structure**: `{workingDirectory}/.agentic-tools-mcp/memories/{category}/{sanitized_title}.json`
- **Performance**: Faster file system operations replace complex vector computations
- **Simplicity**: Human-readable JSON files replace binary vector database files
- **Portability**: Memory data easily portable and version-controllable

#### 🔧 Tool Interface Modernization
- **create_memory**: Now requires both `title` and `content` parameters
- **update_memory**: Can update `title`, `content`, metadata, and category independently
- **search_memories**: Enhanced with multi-field search and relevance scoring
- **All Tools**: Removed `agentId`, `importance`, and `embedding` parameters (simplified schema)
- **Validation**: Improved error messages with specific guidance and examples

#### 📚 Documentation Complete Rewrite
- **AGENT_MEMORIES.md**: Completely rewritten with new architecture and search scoring details
- **QUICK_START_MEMORIES.md**: Updated with title/content examples and search optimization tips
- **README.md**: Updated feature descriptions and architectural information
- **Search Scoring**: New comprehensive section explaining relevance algorithm
- **Optimization Guide**: Best practices for memory structure and searchability

### Removed

#### 🗑️ Vector Database Dependencies
- **Removed**: `@lancedb/lancedb` dependency (vector database)
- **Removed**: `natural` dependency (TF-IDF processing)
- **Removed**: `svd-js` dependency (singular value decomposition)
- **Removed**: All embedding generation and vector similarity code
- **Removed**: Complex semantic search infrastructure

#### 🧹 Simplified Schema
- **Removed**: `agentId` field from memory interface (simplified multi-agent support)
- **Removed**: `importance` field (1-10 scoring system eliminated)
- **Removed**: `embedding` field (vector representations no longer needed)
- **Removed**: `minImportance` parameter from search operations
- **Simplified**: Memory interface now focuses on essential fields only

### Fixed

#### 🐛 Cross-Platform File Path Handling
- **Fixed**: Path duplication issue in `resolveFileNameConflict` method
- **Root Cause**: String replacement using Unix-style separators failed on Windows
- **Solution**: Proper cross-platform path manipulation using Node.js path methods
- **Impact**: Memory creation now works reliably on all operating systems
- **Testing**: Verified fix resolves file path duplication errors

#### 🔍 Enhanced Search Implementation
- **Fixed**: Search now properly covers title field (was missing in previous implementation)
- **Enhanced**: Improved relevance scoring with position and frequency weighting
- **Optimized**: Better search result ranking based on field importance
- **Performance**: Faster text-based search compared to vector operations

### Technical Details

#### 🏗️ Architecture Changes
- **Storage**: JSON files replace LanceDB vector database
- **Search**: Text matching replaces vector similarity search
- **Validation**: Title length validation replaces content length limits
- **File Naming**: Sanitized titles replace content-based file naming
- **Dependencies**: Reduced from 3 external packages to 0 (pure Node.js)

#### 📊 Search Algorithm Specifications
```javascript
// Title Score (up to 100% contribution)
titleScore = (1 - firstMatchPosition / titleLength) * 0.6 + (occurrences / 5) * 0.4

// Content Score (up to 60% contribution)
contentScore = (1 - firstMatchPosition / contentLength) * 0.3 + (occurrences / 10) * 0.3

// Category Score (fixed 20% bonus)
categoryScore = 0.2 (if category matches)

// Final Score (capped at 100%)
finalScore = Math.min(titleScore + contentScore + categoryScore, 1.0)
```

#### 🎯 Score Interpretation Ranges
- **80-100%**: Excellent match (early title match with high frequency)
- **60-79%**: Very good match (strong title or combined matches)
- **40-59%**: Good match (title at end or strong content match)
- **20-39%**: Moderate match (content match or category bonus)
- **10-19%**: Weak match (late content match or low frequency)

### Migration Guide

#### 🔄 Breaking Changes
- **Memory Creation**: Must now provide separate `title` and `content` fields
- **Title Validation**: Titles limited to 50 characters (enforced, not truncated)
- **Removed Fields**: `agentId`, `importance`, and `embedding` no longer supported
- **Search Results**: Relevance scores now based on text matching, not vector similarity

#### 📋 Migration Steps
1. **Update Memory Creation**: Add `title` field to all `create_memory` calls
2. **Review Titles**: Ensure all memory titles are 50 characters or less
3. **Remove Deprecated Fields**: Remove `agentId`, `importance` from existing code
4. **Update Search Logic**: Adjust threshold expectations (text-based vs vector-based)
5. **Test Search**: Verify search results meet expectations with new algorithm

#### 🔧 Compatibility Notes
- **File Migration**: Existing LanceDB files will be ignored (manual migration required)
- **Tool Names**: All tool names remain the same (no breaking changes to MCP interface)
- **Working Directory**: Same storage location pattern maintained
- **Project Isolation**: Project-specific storage behavior unchanged

### Performance Impact

#### ⚡ Improvements
- **Faster Search**: Text matching significantly faster than vector operations
- **Reduced Memory**: No vector embeddings stored (smaller memory footprint)
- **Simpler Startup**: No vector database initialization required
- **Cross-Platform**: Better compatibility across different operating systems

#### 📈 Scalability
- **File System**: Scales well with thousands of memories
- **Search Speed**: Linear search performance acceptable for typical use cases
- **Storage Size**: JSON files more space-efficient than vector database
- **Backup/Restore**: Simple file copying for backup and migration

---

## [1.3.2] - 2025-05-28

### Fixed

#### 🎯 Default Threshold Correction
- **Fixed**: Search tool now correctly uses 0.3 default threshold instead of hardcoded 0.7
- **Updated**: All documentation examples to use realistic 0.3 threshold
- **Enhanced**: Search tool displays actual threshold used (config default when not specified)
- **Improved**: Corpus size recommendations now show when search returns no results

#### 📊 Corpus Statistics Integration
- **Added**: Corpus quality assessment in search results when no matches found
- **Added**: Automatic recommendations based on memory count (minimal/basic/good/optimal/excellent)
- **Enhanced**: Better user guidance for improving semantic search quality

#### 📚 Documentation Updates
- **Fixed**: All 0.7 threshold references updated to 0.3 across documentation
- **Updated**: API reference, quick start guide, and troubleshooting sections
- **Improved**: Corpus size guidelines with specific recommendations

---

## [1.3.0] - 2025-05-28

### Added

#### 🚀 TF-IDF + SVD (LSA) Embeddings Implementation
- **Major Upgrade**: Replaced basic hash-based embeddings with TF-IDF + SVD (Latent Semantic Analysis)
- **Semantic Understanding**: Now captures actual semantic relationships between terms and concepts
- **Technical Content**: Excellent performance with programming concepts, code, and technical documentation
- **Dependencies**: Added `natural` (TF-IDF) and `svd-js` (Singular Value Decomposition) packages

#### 📊 Dramatically Improved Similarity Scoring
- **Score Range**: Now achieves 0.3-0.6 similarity scores for related content (vs 0.1-0.2 with hash)
- **Default Threshold**: Increased from 0.1 to 0.3 (realistic for quality embeddings)
- **Embedding Dimension**: Optimized to 200D for TF-IDF + SVD performance
- **Decay Factor**: Reduced to 1.0 for gentler similarity conversion

#### 🧠 Advanced Corpus Management
- **Dynamic Corpus**: Automatically builds and updates TF-IDF corpus from existing memories
- **Incremental Learning**: New memories update the semantic understanding model
- **SVD Optimization**: Applies SVD when sufficient documents available, falls back to TF-IDF gracefully
- **Performance**: Corpus updates only when needed, cached for efficiency

### Improved

#### 🔍 Semantic Search Quality
- **Cross-Domain Matching**: Finds related concepts across different technical domains
- **Term Relationships**: Understands that "TypeScript" relates to "JavaScript" and "programming"
- **Context Awareness**: Captures latent topics like "frontend", "backend", "performance"
- **Technical Terminology**: Excellent with API design, database optimization, component patterns

#### 🎯 Threshold Behavior
- **Realistic Thresholds**: 0.3-0.5 now provide meaningful filtering (vs 0.05-0.15 with hash)
- **Better Distribution**: More intuitive similarity percentages
- **Higher Precision**: Improved relevance of search results
- **Production Ready**: Threshold behavior suitable for real-world LLM memory retrieval

### Technical Details

#### 🔬 TF-IDF + SVD Algorithm
- **TF-IDF**: Captures term importance and document frequency relationships
- **SVD (LSA)**: Finds latent semantic topics in 200-dimensional space
- **Matrix Handling**: Proper dimension validation and transposition for SVD
- **Fallback Strategy**: Graceful degradation to TF-IDF when SVD not applicable

#### 📈 Performance Characteristics
- **Corpus Size**: Optimized for hundreds to thousands of memories
- **Query Speed**: Fast vector operations after initial corpus building
- **Memory Usage**: Efficient 200D embeddings vs previous 384D
- **Scalability**: Handles incremental updates without full recomputation

#### 🔧 Implementation Benefits
- **Zero External APIs**: Pure TypeScript implementation with npm packages
- **Deterministic**: Consistent results for same content
- **Offline Capable**: No internet connection required
- **Customizable**: Easy to tune parameters for specific use cases

---

## [1.2.3] - 2025-05-28

### Improved

#### 📊 Semantic Search Similarity Scoring Enhancement
- **Enhanced**: Improved distance-to-similarity conversion for more realistic scores
- **Fixed**: Similarity threshold behavior - now works properly across different threshold values
- **Changed**: Default similarity threshold from 0.7 to 0.1 (appropriate for basic embeddings)
- **Added**: Exponential decay scoring: `similarity = exp(-distance * 2)` replaces `1 - distance`
- **Benefit**: Eliminates negative similarity scores and provides better score distribution

#### 📚 Documentation Improvements
- **Added**: Comprehensive embedding function documentation with production recommendations
- **Added**: Clear warnings about basic hash-based embedding limitations
- **Added**: Threshold guidance based on embedding quality (0.05-0.15 for basic, 0.7-0.9 for production)
- **Added**: Production embedding model recommendations (OpenAI, Sentence Transformers, Cohere)

#### 🔧 Technical Improvements
- **Enhanced**: Better similarity score calculation prevents negative values
- **Improved**: More intuitive similarity percentages (15-20% for related content)
- **Optimized**: Exponential decay provides better semantic relationship representation
- **Verified**: Extensive testing confirms improved threshold behavior

### Technical Details

#### 🧮 Similarity Scoring Algorithm
- **Previous**: `similarity = 1 - distance` (could be negative, poor distribution)
- **Current**: `similarity = exp(-distance * decayFactor)` (always positive, better distribution)
- **Decay Factor**: 2.0 (optimized for L2 distance with basic embeddings)
- **Score Range**: 0.0 to 1.0 (0% to 100% similarity)

#### 🎯 Threshold Recommendations
- **Basic Embeddings** (current): Use thresholds 0.05-0.15 for meaningful results
- **Production Embeddings**: Use thresholds 0.7-0.9 for high-quality semantic matching
- **Default Changed**: From 0.7 (unrealistic) to 0.1 (practical for current implementation)

---

## [1.2.2] - 2025-05-28

### Fixed

#### 🐛 LanceDB SQL Query Syntax for CamelCase Columns
- **Fixed**: Agent filtering and search operations now work correctly
- **Root Cause**: LanceDB's SQL parser converts unquoted camelCase column names to lowercase
- **Solution**: Use backticks (\`) instead of double quotes (") for `agentId` column in SQL queries
- **Affected Methods**: `getMemories()`, `searchMemories()`, `deleteMemoriesByAgent()`
- **Testing**: Comprehensive test suite with 20 test cases achieving 100% pass rate

#### 📊 Semantic Search Similarity Scoring Improvements
- **Fixed**: Similarity threshold behavior and score calculation
- **Issue**: Only very low thresholds (0.1) returned results, higher thresholds failed
- **Root Cause**: Basic hash-based embedding function + poor distance-to-similarity conversion
- **Solutions**:
  - Improved distance-to-similarity conversion using exponential decay
  - Adjusted default threshold from 0.7 to 0.1 for basic embeddings
  - Added comprehensive documentation about embedding quality vs threshold expectations
- **Impact**: More realistic similarity scores and better threshold behavior

#### 🔧 Distance-to-Similarity Conversion
- **Before**: `similarity = 1 - distance` (could produce negative scores)
- **After**: `similarity = exp(-distance * 2)` (always positive, better distribution)
- **Benefit**: More intuitive similarity scores that properly reflect content relationships

#### 📚 Enhanced Documentation
- **Added**: Clear warnings about basic embedding function limitations
- **Added**: Production recommendations for proper embedding models (OpenAI, Sentence Transformers)
- **Added**: Threshold guidance based on embedding quality

### Technical Details

#### 🔧 SQL Query Syntax Fix
- **Issue**: `"agentId" = 'test-agent-1'` returned 0 results despite data existing
- **Cause**: LanceDB SQL engine treats quoted identifiers differently than expected
- **Solution**: Use backticks for camelCase columns: `` `agentId` = 'test-agent-1' ``
- **Result**: Agent filtering now returns correct results

#### 🧪 Comprehensive Testing
- **Test Coverage**: 20 test cases covering all functionality
- **Success Rate**: 100% pass rate after fix
- **Test Categories**: CRUD operations, filtering, search, error handling, edge cases, performance
- **Production Verification**: All core functionality verified for production readiness

---

## [1.2.1] - 2025-05-28

### Fixed

#### 🐛 LanceDB Query Case Sensitivity (Initial Attempt)
- **Attempted Fix**: Case sensitivity issue in LanceDB column name queries
- **Issue**: Filtering by `agentId` and `category` failed due to column name case mismatch
- **Initial Solution**: Added double quotes around column names in SQL queries
- **Result**: Partial fix - some operations worked, agent filtering still failed
- **Follow-up**: Required additional investigation and proper SQL syntax fix in v1.2.2

---

## [1.2.0] - 2025-05-28

### Added

#### 🧠 Agent Memories System
- **New Feature**: Complete agent memories system with vector database integration
- **LanceDB Integration**: Local vector database for semantic similarity search
- **Auto-Embedding**: Automatic vector generation for memory content
- **Project-Specific Storage**: Isolated memory stores per working directory
- **Rich Metadata**: Flexible metadata system with JSON storage support

#### 🔧 New MCP Tools
- `create_memory` - Create memories with automatic embedding generation
- `search_memories` - Semantic similarity search with configurable thresholds
- `get_memory` - Retrieve specific memories by ID
- `list_memories` - List memories with filtering by agent, category, limit
- `update_memory` - Update existing memories (regenerates embeddings if content changes)
- `delete_memory` - Delete memories with confirmation requirement

#### 📊 Memory Data Model
- **Memory Interface**: Comprehensive memory structure with content, embeddings, metadata
- **Agent Organization**: Support for multi-agent scenarios with agent IDs
- **Categorization**: Flexible category system for memory organization
- **Importance Scoring**: 1-10 importance scale for memory prioritization
- **Timestamps**: Full audit trail with created/updated timestamps

#### 🏗️ Architecture Enhancements
- **Modular Design**: Agent memories module following established patterns
- **TypeScript Types**: Full type safety with comprehensive interfaces
- **Storage Abstraction**: Clean separation between storage interface and implementation
- **Error Handling**: Comprehensive validation and error management

#### 📚 Documentation
- **Agent Memories Guide**: Complete documentation in `docs/AGENT_MEMORIES.md`
- **Updated README**: Enhanced with agent memories features and examples
- **API Documentation**: Comprehensive JSDoc comments throughout codebase
- **Usage Examples**: Clear examples for all memory operations

### Changed

#### 🔄 Server Enhancements
- **Updated Server Description**: Now includes both task management and agent memories
- **Enhanced Logging**: Startup messages include memory features
- **Version Bump**: Updated to v1.2.0 to reflect major feature addition

#### 📦 Dependencies
- **Added**: `@lancedb/lancedb@^0.19.1` for vector database functionality
- **Updated Keywords**: Added vector-database, lancedb, semantic-search, agent-memories

#### 🗂️ Project Structure
- **New Module**: `src/features/agent-memories/` with complete implementation
- **Storage Layer**: LanceDB storage implementation with vector search
- **Tool Layer**: Six new MCP tools for memory management
- **Model Layer**: TypeScript interfaces for memory data structures

### Technical Details

#### 🔍 Vector Search Implementation
- **Embedding Dimension**: 384-dimensional vectors for optimal performance
- **Local Embeddings**: Simple hash-based embedding function (no external APIs)
- **Similarity Threshold**: Configurable threshold (default: 0.7)
- **Search Limits**: Configurable result limits (default: 10, max: 100/1000)

#### 💾 Storage Features
- **File-Based**: Local storage in `.agentic-tools-mcp/memories/` directory
- **Git-Trackable**: Memory data can be committed with project code
- **Project Isolation**: Separate memory stores per working directory
- **Persistence**: All data survives server restarts
- **Performance**: Optimized for thousands of memories with sub-second search

#### 🛡️ Error Handling & Validation
- **Input Validation**: Comprehensive validation for all memory operations
- **Database Errors**: Graceful handling of LanceDB initialization and operation errors
- **File System**: Proper handling of directory and permission issues
- **Memory Limits**: Validation of content length, importance scores, and field sizes

### Testing

#### ✅ Comprehensive Testing
- **CRUD Operations**: All memory operations tested and verified
- **Vector Search**: Semantic similarity search functionality validated
- **Error Scenarios**: Error handling and edge cases tested
- **Integration**: Seamless integration with existing task management verified

### Migration Notes

#### 🔄 Upgrading from v1.1.x
- **No Breaking Changes**: Existing task management functionality unchanged
- **New Dependencies**: LanceDB will be automatically installed
- **Storage**: New `.agentic-tools-mcp/memories/` directory will be created
- **Tools**: Six new MCP tools available immediately after upgrade

#### 📋 Usage
- **Backward Compatibility**: All existing tools and functionality preserved
- **New Features**: Agent memories tools available alongside task management
- **Documentation**: Updated README and new agent memories guide available

---

## [1.1.1] - Initial Release

### Task Management System
- Complete project, task, and subtask management
- Project-specific storage with `.agentic-tools-mcp/tasks/tasks.json`
- Comprehensive CRUD operations
- Git-trackable task data
- Full MCP integration
