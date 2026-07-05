set appPath to path to me as string
set posixAppPath to POSIX path of appPath

display dialog "Welcome to the ProductFlow Installer." & return & return & "This will install the ProductFlow MCP server to your Mac and configure it for use with Claude Desktop and Codex." buttons {"Cancel", "Install"} default button "Install" with title "ProductFlow Installer"

if button returned of result is "Install" then
    display dialog "ProductFlow needs permission to automatically configure your Claude Desktop and Codex config files." & return & return & "Do you allow this?" buttons {"No", "Allow"} default button "Allow" with title "Permission Request"
    if button returned of result is "Allow" then
        try
            do shell script "bash '" & posixAppPath & "Contents/Resources/install.sh' '" & posixAppPath & "'"
            display dialog "Installation successful!" & return & return & "ProductFlow is now ready to use." buttons {"OK"} default button "OK" with title "Success"
        on error errMsg number errNum
            display dialog "Installation failed: " & errMsg buttons {"OK"} default button "OK" with icon stop with title "Error"
        end try
    end if
end if
