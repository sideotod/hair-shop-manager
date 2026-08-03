$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class HairhaeyoCredentialNative
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL
    {
        public UInt32 Flags;
        public UInt32 Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public UInt32 CredentialBlobSize;
        public IntPtr CredentialBlob;
        public UInt32 Persist;
        public UInt32 AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    [DllImport("Advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredWriteW([In] ref CREDENTIAL credential, UInt32 flags);

    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredReadW(string targetName, UInt32 type, UInt32 flags, out IntPtr credential);

    [DllImport("Advapi32.dll", EntryPoint = "CredDeleteW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredDeleteW(string targetName, UInt32 type, UInt32 flags);

    [DllImport("Advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr credential);

    public static CREDENTIAL ReadCredential(IntPtr credential)
    {
        return Marshal.PtrToStructure<CREDENTIAL>(credential);
    }
}
'@ | Out-Null

function Write-Response($value) {
    [Console]::Out.WriteLine(($value | ConvertTo-Json -Compress))
}

try {
    $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
    if ($null -eq $request -or [string]::IsNullOrWhiteSpace([string]$request.target)) { throw "Invalid request" }

    switch ([string]$request.action) {
        "write" {
            if ([string]::IsNullOrWhiteSpace([string]$request.username) -or [string]::IsNullOrEmpty([string]$request.secret)) { throw "Invalid request" }
            $secretBytes = [Text.Encoding]::UTF8.GetBytes([string]$request.secret)
            $blob = [IntPtr]::Zero
            try {
                $blob = [Runtime.InteropServices.Marshal]::AllocCoTaskMem($secretBytes.Length)
                [Runtime.InteropServices.Marshal]::Copy($secretBytes, 0, $blob, $secretBytes.Length)
                $credential = [HairhaeyoCredentialNative+CREDENTIAL]::new()
                $credential.Type = 1
                $credential.TargetName = [string]$request.target
                $credential.CredentialBlob = $blob
                $credential.CredentialBlobSize = $secretBytes.Length
                $credential.Persist = 2
                $credential.UserName = [string]$request.username
                if (-not [HairhaeyoCredentialNative]::CredWriteW([ref]$credential, 0)) { throw "Credential write failed" }
                Write-Response @{ ok = $true }
            } finally {
                if ($blob -ne [IntPtr]::Zero) {
                    [Runtime.InteropServices.Marshal]::Copy((New-Object byte[] $secretBytes.Length), 0, $blob, $secretBytes.Length)
                    [Runtime.InteropServices.Marshal]::FreeCoTaskMem($blob)
                }
                [Array]::Clear($secretBytes, 0, $secretBytes.Length)
            }
        }
        "read" {
            $pointer = [IntPtr]::Zero
            if (-not [HairhaeyoCredentialNative]::CredReadW([string]$request.target, 1, 0, [ref]$pointer)) {
                if ([Runtime.InteropServices.Marshal]::GetLastWin32Error() -eq 1168) { Write-Response @{ ok = $true; found = $false }; break }
                throw "Credential read failed"
            }
            $secretBytes = $null
            $credential = $null
            try {
                $credential = [HairhaeyoCredentialNative]::ReadCredential($pointer)
                $secretBytes = New-Object byte[] $credential.CredentialBlobSize
                if ($secretBytes.Length -gt 0) { [Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $secretBytes, 0, $secretBytes.Length) }
                Write-Response @{ ok = $true; found = $true; username = $credential.UserName; secret = [Text.Encoding]::UTF8.GetString($secretBytes) }
            } finally {
                if ($null -ne $secretBytes) { [Array]::Clear($secretBytes, 0, $secretBytes.Length) }
                if ($null -ne $credential -and $credential.CredentialBlob -ne [IntPtr]::Zero -and $credential.CredentialBlobSize -gt 0) {
                    [Runtime.InteropServices.Marshal]::Copy((New-Object byte[] $credential.CredentialBlobSize), 0, $credential.CredentialBlob, $credential.CredentialBlobSize)
                }
                [HairhaeyoCredentialNative]::CredFree($pointer)
            }
        }
        "delete" {
            if (-not [HairhaeyoCredentialNative]::CredDeleteW([string]$request.target, 1, 0)) {
                if ([Runtime.InteropServices.Marshal]::GetLastWin32Error() -ne 1168) { throw "Credential delete failed" }
            }
            Write-Response @{ ok = $true }
        }
        default { throw "Invalid request" }
    }
} catch {
    Write-Response @{ ok = $false; error = "Windows Credential Manager request failed" }
    exit 1
}
