Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Matheus\Documents\Projetos\dita"
WshShell.Run "cmd /c npm start", 0, False
