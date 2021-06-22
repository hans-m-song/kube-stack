# deployment order in order of dependency
ORDER=(secrets volumes services rbac services deployments)

function deploy() {
    echo kubectl apply -f $@
}

function deploy-folder() {
    for file in $(ls $1); 
        do deploy $file; 
    done
}

function deploy-service() {
    for folder in ${ORDER[@]}; do
        for file in $(find $folder -name $@*);
            do deploy $folder/$file;
        done;
    done
}

if [ $1 = 'service' ]; then
    shift
    deploy-service $@
elif [ $1 = 'folder' ]; then
    shift
    deploy-folder $@
else
    echo "./deploy.sh service|folder ...args"
    exit 1;
fi