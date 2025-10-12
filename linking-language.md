# Papyrus Linking Language Documentation

The Papyrus Linking Language provides a comprehensive system for referencing files and specific sections within files using a powerful syntax that supports wildcards, heading selectors, and advanced filtering options.

## Basic Syntax

All links are enclosed in double curly braces: `{{link_content}}`

### File References

```
{{path/file.md}}                              - Entire file
{{path/*}}                                    - All files in folder
{{path/**}}                                   - All files recursively
```

## Heading Selectors

Add `#` followed by a selector to extract specific sections from files:

### Single Heading

```
{{file.md#Heading}}                           - Heading + all nested content
{{file.md#Heading!}}                          - Heading only (stop at first subheading)
```

### Level-Based Selection

```
{{file.md#=2}}                                - All level-2 headings
{{file.md#=2-4}}                              - All headings level 2 through 4
{{file.md#=2:Heading}}                        - "Heading" only if level-2
```

### Multiple Headings

```
{{file.md#One,Two,Three}}                     - Multiple specific headings
```

### Range Selection

```
{{file.md#Start..End}}                        - Range from Start to End (inclusive)
```

### Pattern Matching

```
{{file.md#/^Week \d+/}}                       - Regex pattern match
{{file.md#i:heading}}                         - Case-insensitive match
```

### Special Characters

```
{{file.md#"Heading: Part 1"}}                 - Quoted for special characters
{{file.md#Heading\,Part}}                     - Escaped special characters
```

## Wildcard Operations

### Basic Wildcards

```
{{path/*}}                                    - All files in folder
{{path/**}}                                   - All files recursively
```

### Filtered Wildcards

```
{{path/*.md}}                                 - Only .md files
{{path/*-notes.md}}                           - Files ending with -notes.md
{{path/lecture*.md}}                          - Files starting with "lecture"
{{path/*test*.md}}                            - Files containing "test"
{{path/**/*.md}}                              - All .md files recursively
```

### Wildcards with Heading Selectors

```
{{path/*#Heading}}                            - "Heading" from all files in folder
{{path/*#=2}}                                 - All level-2 from all files
{{path/*#=2:Heading}}                         - Level-2 "Heading" from all files
{{path/*#Heading!}}                           - Heading-only from all files
{{path/*#Start..End}}                         - Range from all files
{{path/*#One,Two}}                            - Multiple headings from all files
{{path/*#=2-4}}                               - Level range from all files
{{path/*#/pattern/}}                          - Regex from all files
{{path/*#i:heading}}                          - Case-insensitive from all files
```

### Recursive Wildcards with Headings

```
{{path/**#Heading}}                           - "Heading" from all files recursively
{{path/**#=2}}                                - All level-2 recursively
{{path/**#=2:Heading}}                        - Level-2 "Heading" recursively
{{path/**#One,Two}}                           - Multiple headings recursively
```

### Advanced Filtering

```
{{path/*-notes.md#Summary}}                   - "Summary" from *-notes.md files
{{path/lecture*.md#=1}}                       - Level-1 from lecture*.md files
{{path/**/*-draft.md#TODO}}                   - "TODO" from draft files recursively
```

## Combined Operations

You can combine multiple selectors for complex operations:

```
{{path/*#=2:Methods,Results}}                 - Level-2 "Methods" and "Results" from all files
{{path/**#i:/^week \d+/}}                     - Case-insensitive regex recursively
{{path/lecture*.md#Introduction..Summary!}}   - Range without subheadings from lectures
{{path/*#=1-2,Appendix}}                      - Level 1-2 headings + "Appendix" from all
```

## Special Characters Reference

| Character | Purpose | Example |
|-----------|---------|---------|
| `#` | Heading separator | `file.md#Heading` |
| `=` | Level indicator | `#=2` |
| `:` | Level constraint separator | `#=2:Heading` |
| `!` | Exclude nested content | `#Heading!` |
| `..` | Range operator | `#Start..End` |
| `,` | List separator | `#One,Two,Three` |
| `/pattern/` | Regex delimiters | `#/^Week \d+/` |
| `i:` | Case-insensitive prefix | `#i:heading` |
| `\` | Escape character | `#Heading\,Part` |
| `""` | Quote delimiter | `#"Heading: Part 1"` |
| `*` | Wildcard (folder level) | `path/*` |
| `**` | Wildcard (recursive) | `path/**` |

## Examples by Use Case

### Documentation Projects

```
{{docs/*#Overview}}                           - Overview sections from all docs
{{docs/**#=1}}                                - All main headings from all docs
{{api/**#Examples}}                           - Examples from all API docs
```

### Research Notes

```
{{notes/*#Methodology}}                       - Methodology from all notes
{{papers/**#=2:Results}}                      - Level-2 Results sections
{{experiments/*#/^Experiment \d+/}}           - Numbered experiments
```

### Course Materials

```
{{lectures/*#Summary}}                        - Summaries from all lectures
{{assignments/**#Requirements}}               - Requirements from all assignments
{{week*/*#=1-2}}                             - Main headings from weekly materials
```

### Project Management

```
{{meetings/*#Action Items}}                   - Action items from all meetings
{{status/**#=2:Blockers}}                    - Level-2 Blockers sections
{{planning/*#Goals..Timeline}}                - Goals through Timeline sections
```

## Error Handling

The system provides helpful error messages for common issues:

- `[File not found: filename]` - File doesn't exist
- `[Heading not found: heading]` - Specified heading not found
- `[No headings found in file]` - File contains no markdown headings
- `[No files found matching pattern: pattern]` - Wildcard matched no files
- `[Invalid range: start heading comes after end heading]` - Range is backwards

## Performance Considerations

- Wildcards are processed in alphabetical order
- Recursive wildcards (`**`) may be slower on large directory trees
- Complex regex patterns may impact performance
- File content is cached during processing to avoid re-reading

## Security

- All file paths are validated to ensure they remain within the configured root directory
- Only `.md` and `.txt` files are supported for security reasons
- Path traversal attempts (`../`) are blocked

## Integration with Substitutes

The linking language works seamlessly with the substitutes system:

1. Create a substitute with a complex link pattern
2. Reference the substitute by name in other content
3. The system will resolve the substitute first, then process any file links within it

Example:
```
Substitute "weekly-summaries": {{week*/*#Summary}}
Usage: {{weekly-summaries}}
```

This powerful linking system enables you to create dynamic, maintainable documentation that automatically includes content from multiple sources while providing fine-grained control over what sections are included.
