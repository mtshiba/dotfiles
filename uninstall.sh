#...

DOTPATH=~/dotfiles

for f in .??*
do
    [ "$f" = ".git" ] && continue

    unlink "$HOME"/"$f"
done
